const db = require('../models');
const CrudRepository = require('./crud-repository');

class BookingRepository extends CrudRepository{
    constructor(){
        super(db.Booking)
    }

    async createBooking(data, t){
        const booking = await db.Booking.create(data, {transaction: t});
        return booking;
    }
}

module.exports = BookingRepository;