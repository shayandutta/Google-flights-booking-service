const db = require('../models');
const CrudRepository = require('./crud-repository');
const { StatusCodes } = require('http-status-codes');
const AppError = require('../utils/errors/app-error');

class BookingRepository extends CrudRepository{
    constructor(){
        super(db.Booking)
    }

    async createBooking(data, t){
        const booking = await db.Booking.create(data, {transaction: t});
        return booking;
    }


    //override the get method to use the transaction
    async get(data, t){
        const response = await this.model.findByPk(data, {transaction: t});
        if(!response){
            throw new AppError('Not able to find the resource', StatusCodes.NOT_FOUND);
        }
        return response;
    }

    async update(id, data, t){
        const response = await this.model.update(data, {where: {id: id}, transaction: t});
        if(response[0] === 0){
            throw new AppError('Not able to update the resource', StatusCodes.NOT_FOUND);
        }
        return response;
    }
}

module.exports = BookingRepository;