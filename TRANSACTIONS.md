# Database Transactions Guide

## 📍 Where Transactions Are Used

### 1. **Booking Service** (`src/services/booking-service.js`)

The booking service uses transactions to ensure that the entire booking creation process is atomic - if any step fails, everything is rolled back.

**Location:** `src/services/booking-service.js` (Line 27-50)

```javascript
// Start a transaction
const transaction = await db.sequelize.transaction();

try {
    // 1. Fetch flight data (external API call)
    const flight = await axios.get(`${ServerConfig.FLIGHTS_SERVICE_URL}/api/v1/flights/${data.flightId}`);
    const flightData = flight.data.data;
    
    // 2. Validate seat availability
    if(data.noOfSeats > flightData.totalSeats) {
        throw new AppError('Not enough seats available', StatusCodes.BAD_REQUEST);
    }
    
    // 3. Calculate total cost
    const totalBillingAmount = data.noOfSeats * flightData.price;
    const bookingPayload = {...data, totalCost: totalBillingAmount};
    
    // 4. Create booking record (WITHIN transaction)
    const booking = await bookingRepository.create(bookingPayload, transaction);
    
    // 5. Update flight seat availability (external API call)
    await axios.patch(`${ServerConfig.FLIGHTS_SERVICE_URL}/api/v1/flights/${data.flightId}/seats`, {
        seats: data.noOfSeats,
    });
    
    // 6. Commit transaction - all changes are saved
    await transaction.commit();
    return booking;
    
} catch(error) {
    // 7. Rollback on any error - all changes are discarded
    await transaction.rollback();
    throw error;
}
```

**Purpose:** Ensures booking creation is atomic - if validation fails or any step errors, the booking record is not created.

---

### 2. **Booking Repository** (`src/repositories/booking-repository.js`)

The booking repository has a custom method that accepts a transaction parameter.

**Location:** `src/repositories/booking-repository.js` (Line 9-12)

```javascript
async createBooking(data, transaction) {
    // Passes transaction to Sequelize create operation
    const booking = await db.Booking.create(data, {transaction: transaction});
    return booking;
}
```

**Purpose:** Allows the repository method to participate in a transaction started at the service layer.

---

### 3. **Flight Repository** (Other Microservice)

The flight repository uses transactions with **pessimistic locking** to prevent race conditions when updating seat availability.

**Pattern Used:**
```javascript
async updateRemainingSeats(flightId, seats, dec = true) {
    const transaction = await db.sequelize.transaction();
    
    try {
        // Row-level lock using FOR UPDATE - prevents concurrent modifications
        await db.sequelize.query(addRowLockOnFlights(flightId));
        
        // Fetch flight with lock held
        const flight = await Flight.findByPk(flightId);
        
        // Decrement or increment seats within transaction
        if(dec) {
            await flight.decrement('totalSeats', {by: seats}, {transaction: transaction});
        } else {
            await flight.increment('totalSeats', {by: seats}, {transaction: transaction});
        }
        
        await transaction.commit();
        return flight;
        
    } catch(error) {
        await transaction.rollback();
        throw error;
    }
}
```

**Purpose:** 
- Prevents race conditions when multiple bookings try to update seats simultaneously
- Uses `FOR UPDATE` lock to ensure only one transaction can modify the flight row at a time
- Critical for preventing overbooking scenarios

---

## 🔄 How Transactions Work

### ACID Properties

Transactions in databases follow **ACID** principles:

1. **Atomicity** - All operations succeed together or all fail together
2. **Consistency** - Database remains in a valid state
3. **Isolation** - Concurrent transactions don't interfere with each other
4. **Durability** - Once committed, changes are permanent

### Transaction Flow Diagram

```
┌─────────────────────────────────────────┐
│  1. START TRANSACTION                    │
│     const t = await db.sequelize.       │
│              transaction()               │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  2. EXECUTE OPERATIONS                   │
│     - All DB operations use             │
│       {transaction: t}                   │
│     - Changes are NOT visible to        │
│       other transactions until commit    │
│     - Changes are isolated              │
└─────────────────────────────────────────┘
              │
        ┌─────┴─────┐
        │           │
        ▼           ▼
┌──────────┐  ┌──────────┐
│ SUCCESS  │  │  ERROR    │
└──────────┘  └──────────┘
        │           │
        ▼           ▼
┌──────────┐  ┌──────────┐
│ COMMIT   │  │ ROLLBACK  │
│ Changes  │  │ Discard   │
│ saved    │  │ changes   │
│ to DB    │  │ revert    │
└──────────┘  └──────────┘
```

### Passing Transactions to Operations

When you pass `{transaction: transaction}` to Sequelize operations:

- ✅ The operation runs **within** that transaction
- ✅ Changes are **isolated** - not visible to other transactions until commit
- ✅ On rollback, **all changes** in the transaction are undone
- ✅ All operations share the same transaction context

**Example:**
```javascript
// Without transaction - auto-commits immediately
await Booking.create(data);
// ✅ Record is immediately visible to other queries

// With transaction - part of transaction scope
await Booking.create(data, {transaction: t});
// ⏳ Record is NOT visible until transaction.commit()
// ⏳ Will be rolled back if transaction.rollback() is called
```

---

## 🔍 Key Differences Between Microservices

### Booking Service (This Microservice)

| Aspect | Details |
|--------|---------|
| **Purpose** | Ensure booking creation is atomic |
| **Pattern** | Manual transaction management with try-catch |
| **Scope** | Single database operation (booking creation) |
| **Locking** | No explicit locking |
| **Limitation** | External API calls (axios) are NOT transactional |

### Flight Service (Other Microservice)

| Aspect | Details |
|--------|---------|
| **Purpose** | Prevent race conditions when updating seats |
| **Pattern** | Pessimistic locking with `FOR UPDATE` |
| **Scope** | Prevents concurrent seat updates |
| **Locking** | Row-level lock (`FOR UPDATE`) |
| **Benefit** | Ensures data consistency under high concurrency |

---

## ⚠️ Important Considerations

### 1. **External API Calls Are NOT Transactional**

In `booking-service.js`, the `axios.get()` and `axios.patch()` calls are **NOT** part of the database transaction:

```javascript
// ❌ This is NOT transactional
const flight = await axios.get(`${ServerConfig.FLIGHTS_SERVICE_URL}/...`);

// ✅ This IS transactional
const booking = await bookingRepository.create(bookingPayload, transaction);

// ❌ This is NOT transactional
await axios.patch(`${ServerConfig.FLIGHTS_SERVICE_URL}/...`);
```

**Implication:** If the external API call fails after the booking is created, the booking will still be committed (unless you handle it explicitly).

### 2. **Transaction Scope**

Only database operations that explicitly use `{transaction: t}` are part of the transaction:

```javascript
// Part of transaction
await Booking.create(data, {transaction: t});

// NOT part of transaction - runs independently
await Booking.create(data);
```

### 3. **Row Locking in Flight Service**

The `FOR UPDATE` lock in the flight service:
- Locks the row until the transaction completes
- Prevents two concurrent bookings from overbooking seats
- Ensures sequential processing of seat updates

**Example Scenario:**
```
Time  | Transaction A              | Transaction B
------|----------------------------|----------------------------
T1    | START TRANSACTION          |
T2    | LOCK flight row (FOR UPDATE)|
T3    |                            | START TRANSACTION
T4    |                            | WAIT (row is locked)
T5    | Read totalSeats = 10       |
T6    | Decrement to 8             |
T7    | COMMIT (unlocks row)       |
T8    |                            | ACQUIRE LOCK
T9    |                            | Read totalSeats = 8
T10   |                            | Decrement to 6
T11   |                            | COMMIT
```

### 4. **Transaction Lifecycle**

```javascript
// 1. Create transaction object
const t = await db.sequelize.transaction();

// 2. Use transaction in operations
await Model.create(data, {transaction: t});
await Model.update(data, {where: {...}, transaction: t});

// 3. Either commit or rollback
await t.commit();   // ✅ Save all changes
// OR
await t.rollback(); // ❌ Discard all changes
```

---

## 🛠️ Best Practices

### ✅ DO:

1. **Always use try-catch** with transactions
   ```javascript
   const t = await db.sequelize.transaction();
   try {
       // operations
       await t.commit();
   } catch(error) {
       await t.rollback();
       throw error;
   }
   ```

2. **Pass transaction to all related operations**
   ```javascript
   await Booking.create(data, {transaction: t});
   await Booking.update(data, {where: {...}, transaction: t});
   ```

3. **Use row locking for concurrent updates**
   ```javascript
   await db.sequelize.query('SELECT * FROM flights WHERE id = ? FOR UPDATE');
   ```

4. **Keep transactions short** - long transactions can cause deadlocks

### ❌ DON'T:

1. **Don't forget to commit or rollback** - transactions will hold locks until completed
2. **Don't nest transactions unnecessarily** - use one transaction per logical operation
3. **Don't mix transactional and non-transactional operations** without understanding the implications
4. **Don't make external API calls inside transactions** - they're not transactional and can cause timeouts

---

## 📚 Additional Resources

- [Sequelize Transactions Documentation](https://sequelize.org/docs/v6/other-topics/transactions/)
- [Database ACID Properties](https://en.wikipedia.org/wiki/ACID)
- [Pessimistic vs Optimistic Locking](https://en.wikipedia.org/wiki/Lock_(computer_science))

---

## 🔗 Related Files

- `src/services/booking-service.js` - Main transaction usage
- `src/repositories/booking-repository.js` - Repository with transaction support
- `src/repositories/crud-repository.js` - Base repository (currently doesn't support transactions)
- `src/models/index.js` - Sequelize setup with transaction support
