const db = require('../models');
const CrudRepository = require('./crud-repository');

class BookingRepository extends CrudRepository{
    constructor(){
        super(db.Booking)
    }

    async createBooking(data, transaction){
        const booking = await db.Booking.create(data, {transaction: transaction});
        return booking;
    }
}

module.exports = BookingRepository;