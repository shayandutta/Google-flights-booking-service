const axios = require('axios');
const db = require('../models'); 
const {ServerConfig} = require('../config');
const AppError = require('../utils/errors/app-error');
const {StatusCodes} = require('http-status-codes');
const BookingRepository = require('../repositories/booking-repository');
const { Enums } = require('../utils/common');
const {BOOKED, CANCELLED} = Enums.BookingStatus;

const bookingRepository = new BookingRepository();

//the entire booking should be in a single transaction -> if any of the steps fail, the entire booking should be rolled back
async function createBooking(data){
    
    //managed transaction using promises

    // return new Promise(async (resolve, reject)=> {
    //         const result = await db.sequelize.transaction(async function(t){
    //             const flight = await axios.get(`${ServerConfig.FLIGHTS_SERVICE_URL}/api/v1/flights/${data.flightId}`);
    //             const flightData = flight.data.data;
    //             if(data.noOfSeats>flightData.totalSeats){
    //                 reject(new AppError('Not enough seats available', StatusCodes.BAD_REQUEST));
    //             }
    //             resolve(true);
    //         })
    // })


    //handling transactions better, the above approach is not good as it is not scalable and not efficient -> nested callbacks are not good

    //unmanaged transaction using try-catch
    // start a transaction
    const t = await db.sequelize.transaction();
    try{
        const flight = await axios.get(`${ServerConfig.FLIGHTS_SERVICE_URL}/api/v1/flights/${data.flightId}`); //connecting to the flights microservice
        const flightData = flight.data.data;
        
        //validate the flight seat availability
        if(data.noOfSeats>flightData.totalSeats){
            throw new AppError('Not enough seats available', StatusCodes.BAD_REQUEST);
        }
        const totalBillingAmount = data.noOfSeats *flightData.price;
        const bookingPayload = {...data, totalCost: totalBillingAmount};//bookingPayload ->  { flightId: 3, userId: 1, noOfSeats: 20, totalCost: 104000 }
        const booking = await bookingRepository.createBooking(bookingPayload, t);

        //update the flight seat availability
        await axios.patch(`${ServerConfig.FLIGHTS_SERVICE_URL}/api/v1/flights/${data.flightId}/seats`, {
            seats: data.noOfSeats,
        });
        
        await t.commit();
        return booking;
    }catch(error){
        await t.rollback();
        throw error;
    }
}

async function makePayment(data){
    const t = await db.sequelize.transaction();
    try{
        const bookingDetails = await bookingRepository.get(data.bookingId, t);
        if(bookingDetails.status == CANCELLED){
            throw new AppError('Booking expired', StatusCodes.BAD_REQUEST);
        }
        const bookingTime = new Date(bookingDetails.createdAt);
        const currentTime = new Date();
        if(currentTime - bookingTime > 1000*60*5){
            // Use separate transaction for cancellation to ensure it's committed
            const cancelTransaction = await db.sequelize.transaction();
            try {
                await bookingRepository.update(data.bookingId, {status:CANCELLED}, cancelTransaction);
                await cancelTransaction.commit(); // Commit the cancellation
            } catch(cancelError) {
                await cancelTransaction.rollback();
                throw cancelError;
            }
            // Now throw error after cancellation is committed
             // Rollback the main transaction
            throw new AppError('Booking marked cancelled as its expired', StatusCodes.BAD_REQUEST);
        }
        if(bookingDetails.totalCost !== data.totalCost){
            throw new AppError('Total cost mismatch', StatusCodes.BAD_REQUEST);
        }
        if(bookingDetails.userId !== data.userId){
            throw new AppError('User ID mismatch', StatusCodes.BAD_REQUEST);
        }
        //we assume here that payment is successful
        const response = await bookingRepository.update(data.bookingId, {status: BOOKED}, t);
        await t.commit();
        return response;
    }catch(error){
        await t.rollback();
        throw error;
    }
}

module.exports = {
    createBooking,
    makePayment,
}