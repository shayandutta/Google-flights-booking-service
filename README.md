# Bookings API - Microservice Documentation

## 📚 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Layers](#architecture--layers)
3. [Project Structure](#project-structure)
4. [Request & Response Flow](#request--response-flow)
5. [Error Handling](#error-handling)
6. [Key Classes & Utilities](#key-classes--utilities)
7. [API Endpoints](#api-endpoints)
8. [Getting Started](#getting-started)

---

## 🎯 Project Overview

A **RESTful microservice** for managing flight bookings, built with **Node.js**, **Express**, and **Sequelize ORM**. This service is a microservice of the [Google-flights](https://github.com/shayandutta/Google-flights) project and handles all booking-related operations. The project follows a **layered architecture** pattern with clean separation of concerns.

### Features:
- CRUD operations for Bookings
- Booking status management (INITIATED, PENDING, BOOKED, CANCELLED)
- Support for multiple seat types (Economy, Premium Economy, Business, First Class)
- Standardized error handling and responses
- Model-level and middleware-level validation
- Integration-ready for flights service

---

## 🏗️ Architecture & Layers

The project follows a **4-layer architecture**:

```
Route → Middleware → Controller → Service → Repository → Model → Database
```

### Layer Responsibilities:

| Layer | Responsibility | HTTP-Aware? |
|-------|---------------|-------------|
| **Route** | Defines API endpoints | ✅ Yes |
| **Middleware** | Validates incoming requests | ✅ Yes |
| **Controller** | Handles HTTP requests/responses | ✅ Yes |
| **Service** | Business logic | ❌ No |
| **Repository** | Database operations | ❌ No |
| **Model** | Database schema & validation | ❌ No |

**Key Principle:** Service and Repository layers are HTTP-agnostic (can be used in CLI, background jobs, etc.)

---

## 📁 Project Structure

```
flights-booking-service/
├── src/
│   ├── index.js                    # Entry point, Express app setup
│   ├── config/                     # Configuration files
│   │   ├── server-config.js       # Server settings
│   │   ├── logger-config.js       # Logging setup
│   │   └── config.json            # Database configuration
│   │
│   ├── routes/                     # API routes
│   │   ├── index.js               # Main routes entry
│   │   └── v1/                    # API version 1 routes
│   │       └── index.js           # V1 route definitions
│   │
│   ├── middlewares/                # Request validation
│   │   └── index.js               # Middleware exports
│   │
│   ├── controllers/               # HTTP request handlers
│   │   ├── booking-controller.js
│   │   ├── info-controller.js    # Health check endpoint
│   │   └── index.js
│   │
│   ├── services/                  # Business logic
│   │   ├── booking-service.js
│   │   └── index.js
│   │
│   ├── repositories/              # Database operations
│   │   ├── crud-repository.js    # Base CRUD class
│   │   ├── booking-repository.js
│   │   └── index.js
│   │
│   ├── models/                    # Sequelize models
│   │   ├── booking.js
│   │   └── index.js
│   │
│   ├── migrations/                # Database migrations
│   │   └── 20260117212108-create-booking.js
│   │
│   ├── seeders/                   # Database seeders
│   │
│   └── utils/                     # Utility classes & helpers
│       ├── common/
│       │   ├── success-response.js
│       │   ├── error-response.js
│       │   ├── enums.js          # BookingStatus, SeatType enums
│       │   └── index.js
│       ├── errors/
│       │   └── app-error.js
│       └── helpers/
│           ├── filters.js
│           └── dateTimeHelpers.js
│
├── package.json
└── README.md
```

---

## 🔄 Request & Response Flow

### Example: Creating a Booking

**1. Client Request:**
```http
POST /api/v1/bookings
Content-Type: application/json

{
  "flightId": 1,
  "userId": 123,
  "noOfSeats": 2,
  "totalCost": 15600
}
```

**2. Flow:**
```
Route → Middleware (validates) → Controller → Service (business logic) 
→ Repository → Model → Database
```

**3. Response:**
```json
{
  "success": true,
  "message": "Successfully completed the request",
  "data": {
    "id": 1,
    "flightId": 1,
    "userId": 123,
    "status": "initiated",
    "totalCost": 15600,
    "noOfSeats": 2,
    "createdAt": "2026-01-20T10:30:00.000Z",
    "updatedAt": "2026-01-20T10:30:00.000Z"
  },
  "error": {}
}
```

---

## ⚠️ Error Handling

### Error Flow:
```
Error Occurs → Service converts to AppError → Controller formats ErrorResponse → Client
```

### Error Types:
1. **SequelizeValidationError** - Model validation fails → 400 BAD_REQUEST
2. **SequelizeUniqueConstraintError** - Model validation fails → 400 BAD_REQUEST
2. **AppError** - Custom application errors → Custom status code
3. **Database Errors** - Connection issues → 500 INTERNAL_SERVER_ERROR

### Example Error Response:
```json
{
  "success": false,
  "message": "Something went wrong",
  "data": {},
  "error": {
    "statusCode": 400,
    "explanation": "Flight not found or seats not available"
  }
}
```

---

## 🏛️ Key Classes & Utilities

### 1. AppError Class
Custom error class with HTTP status codes.

```javascript
throw new AppError("Booking not found", StatusCodes.NOT_FOUND);
// Creates: { statusCode: 404, explanation: "Booking not found" }
```

### 2. CrudRepository Class
Base class providing common CRUD operations for all repositories.

```javascript
class BookingRepository extends CrudRepository {
  constructor() {
    super(Booking);  // Inherits create, get, getAll, update, destroy
  }
}
```

### 3. Response Templates
Standardized success and error responses.

```javascript
// Success
SuccessResponse.data = booking;
return res.status(201).json(SuccessResponse);

// Error
ErrorResponse.error = error;
return res.status(error.statusCode).json(ErrorResponse);
```

### 4. Enums (`utils/common/enums.js`)
Centralized enumeration values for the application.

**BookingStatus:**
- `INITIATED` - Booking has been created but not confirmed
- `PENDING` - Booking is pending payment/confirmation
- `BOOKED` - Booking is confirmed and active
- `CANCELLED` - Booking has been cancelled

**SeatType:**
- `ECONOMY` - Economy class seats
- `PREMIUM_ECONOMY` - Premium economy class seats
- `BUSINESS` - Business class seats
- `FIRST_CLASS` - First class seats

---

## 🌐 API Endpoints

### Bookings
- `POST /api/v1/bookings` - Create a new booking
- `GET /api/v1/bookings` - Get all bookings (with filters)
- `GET /api/v1/bookings/:id` - Get booking by ID
- `PATCH /api/v1/bookings/:id` - Update booking (e.g., change status)
- `DELETE /api/v1/bookings/:id` - Cancel/delete booking

**Booking Query Parameters (Future):**
- `userId=123` - Filter by user ID
- `flightId=1` - Filter by flight ID
- `status=booked` - Filter by booking status
- `sort=createdAt_DESC` - Sort results

**Example:**
```http
GET /api/v1/bookings?userId=123&status=booked&sort=createdAt_DESC
```

### Health Check
- `GET /api/v1/info` - API health check endpoint

**Response:**
```json
{
  "success": true,
  "message": "API is live",
  "error": {},
  "data": {}
}
```

---

## 🚀 Getting Started

### Prerequisites:
- Node.js installed
- MySQL database running
- Environment variables configured (`.env` file)

### Installation:
```bash
npm install
```

### Environment Variables:
Create a `.env` file in the root directory:
```env
PORT=3001
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=bookings_db
```

### Database Setup:
```bash
# Run migrations
npx sequelize-cli db:migrate

# Run seeders (optional)
npx sequelize-cli db:seed:all
```

### Start Server:
```bash
npm run dev
```

The server will start on the port specified in your `.env` file (default: 3001).

---

## 📝 Key Concepts

### Why Layered Architecture?
- **Separation of Concerns**: Each layer has one responsibility
- **Testability**: Test each layer independently
- **Maintainability**: Changes in one layer don't affect others
- **Scalability**: Easy to add new features

### Why HTTP-Agnostic Service/Repository?
Service and Repository layers don't know about HTTP, so they can be used in:
- REST APIs (current use case)
- CLI applications
- Background jobs
- GraphQL APIs
- WebSocket handlers

### Why Response Templates?
- **Consistency**: All endpoints return the same structure
- **Predictability**: Frontend knows what to expect
- **Error Handling**: Uniform error format

### Microservice Architecture
This service is designed as a microservice, which means:
- **Independent Deployment**: Can be deployed separately from the flights service
- **Service Communication**: Can communicate with flights service via HTTP/gRPC
- **Scalability**: Can scale independently based on booking traffic
- **Technology Flexibility**: Can use different technologies if needed

---

## 🔗 Integration with Flights Service

This microservice integrates with the [Google-flights](https://github.com/shayandutta/Google-flights) service to:
- Validate flight availability before booking
- Fetch flight details for booking confirmation
- Update flight seat availability after booking
- Handle flight cancellations and their impact on bookings

**Note:** Integration endpoints and communication patterns will be defined as the system evolves.

---

## 📊 Booking Model Schema

### Booking Fields:
- `id` (INTEGER, Primary Key, Auto Increment)
- `flightId` (INTEGER, Required) - Reference to flight
- `userId` (INTEGER, Required) - Reference to user
- `status` (ENUM, Required) - Booking status (INITIATED, PENDING, BOOKED, CANCELLED)
- `totalCost` (INTEGER, Required) - Total booking cost
- `noOfSeats` (INTEGER, Required, Default: 1) - Number of seats booked
- `createdAt` (DATE, Auto-generated)
- `updatedAt` (DATE, Auto-generated)

---

## 🤝 Contributing

When adding new features:
1. Follow the layered architecture
2. Use CrudRepository for new repositories
3. Use AppError for custom errors
4. Use SuccessResponse/ErrorResponse for responses
5. Add validation in models and middlewares
6. Update this documentation
7. Consider microservice communication patterns when integrating with other services

---

**Happy Coding! 🚀**
