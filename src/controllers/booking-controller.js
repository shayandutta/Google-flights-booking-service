const { StatusCodes } = require('http-status-codes');
const {BookingService} = require('../services');
const {SuccessResponse, ErrorResponse} = require('../utils/common');
const AppError = require('../utils/errors/app-error');


const inMemoryDb = new Map();


async function createBooking(req, res){
    try{
        const booking = await BookingService.createBooking({
            flightId: req.body.flightId,
            userId: req.body.userId,
            noOfSeats: req.body.noOfSeats
        });
        SuccessResponse.data = booking;
        return res
        .status(StatusCodes.CREATED)
        .json(SuccessResponse);
    }catch(error){
        console.log(error);
        ErrorResponse.error = error;
        return res
        .status(error.statusCode)
        .json(ErrorResponse);
    }
}

//idempoten api
//1. the client should send a unique idempotency key with each request
//2. the server should store the idempotency key in a database or in-memory if the request is successful and the idempotency key is not already stored
//3. if the request is not successful, the server should return the error

async function makePayment(req, res){
    try{
        const idempotencyKey = req.headers['x-idempotency-key']; //this is the key that is used to prevent duplicate requests
        if(!idempotencyKey){
            return res
            .status(StatusCodes.BAD_REQUEST)
            .json(new AppError('Idempotency key missing', StatusCodes.BAD_REQUEST));
        }
        if(inMemoryDb[idempotencyKey]){ //this is to prevent duplicate requests
            return res
            .status(StatusCodes.BAD_REQUEST)
            .json(new AppError('cannot retry on a successful payment', StatusCodes.BAD_REQUEST));
        }
        const response = await BookingService.makePayment({
            totalCost: req.body.totalCost,
            userId: req.body.userId,
            bookingId: req.body.bookingId
        });
        inMemoryDb[idempotencyKey] = idempotencyKey;
        SuccessResponse.data = response;
        return res
        .status(StatusCodes.OK)
        .json(SuccessResponse);
    }catch(error){
        ErrorResponse.error = error;
        return res
        .status(error.statusCode)
        .json(ErrorResponse);
    }
}

module.exports={
    createBooking,
    makePayment,
}