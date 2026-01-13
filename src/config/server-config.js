const dotenv = require('dotenv'); //importing the dotenv module in a dotenv object

dotenv.config(); //dotenv object will call the config function that will load the .env file and make the variables available in the process.env object

module.exports = {
    PORT: process.env.PORT
}