const cron = require('node-cron');

const {BookingService} = require('../../services/');

function scheduleCrons(){
    cron.schedule('*/30 * * * *', async () => {
        const response = await BookingService.cancelExpiredBookings();
        console.log("response", response);
    });
}

module.exports = scheduleCrons;