//this file contains all the enums for the application

const SeatType = {
    ECONOMY: 'Economy',
    PREMIUM_ECONOMY: 'Premium-Economy',
    BUSINESS: 'Business',
    FIRST_CLASS: 'First-class',
}

const BookingStatus = {
    BOOKED: 'booked',
    CANCELLED: 'cancelled',
    INITIATED: 'initiated',
    PENDING: 'pending',
}

module.exports = {
    SeatType,
    BookingStatus,
}