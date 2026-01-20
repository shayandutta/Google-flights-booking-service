const express = require('express');
const router = express.Router();
const {InfoController} = require('../../controllers');
const bookingRoutes = require('./booking');

//server health check
router.get('/info', InfoController.info);

//booking routes
router.use('/bookings', bookingRoutes);

module.exports = router;