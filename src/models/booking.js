'use strict';
const {
  Model
} = require('sequelize');
const { Enums } = require('../utils/common');
const{BOOKED, CANCELLED, INITIATED, PENDING} = Enums.BookingStatus;
module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      //no association with other models -> as of now
      //the following associations we be implemented:
        //1. Booking <-> Flight (1:1)
        //2. Booking <-> User (M:1)
          //context: 
              //1. a booking can belong to one flight
              //2. a single user can have multiple bookings
    }
  }
  Booking.init({
    flightId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // status: {
    //   type: DataTypes.ENUM,
    //   allowNull: false,
    // },
    status: {
      type: DataTypes.ENUM,
      allowNull: false,
      values: [BOOKED, CANCELLED, INITIATED, PENDING],
      defaultValue: INITIATED,
    },
    totalCost: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    noOfSeats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  }, {
    sequelize,
    modelName: 'Booking',
  });
  return Booking;
};