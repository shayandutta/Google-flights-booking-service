const axios = require('axios');
const {BookingRepository} = require('../repositories');
const db = require('../models'); 
const {ServerConfig} = require('../config');
const AppError = require('../utils/errors/app-error');
const {StatusCodes} = require('http-status-codes');

//the entire booking should be in a single transaction -> if any of the steps fail, the entire booking should be rolled back
async function createBooking(data){

    return new Promise(async (resolve, reject)=> {
            const result = await db.sequelize.transaction(async function(t){
                const flight = await axios.get(`${ServerConfig.FLIGHTS_SERVICE_URL}/api/v1/flights/${data.flightId}`);
                const flightData = flight.data.data;
                if(data.noOfSeats>flightData.totalSeats){
                    reject(new AppError('Not enough seats available', StatusCodes.BAD_REQUEST));
                }
                resolve(true);
            })
    })
}

module.exports = {
    createBooking,
}