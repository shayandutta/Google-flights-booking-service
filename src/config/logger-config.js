const {createLogger, format, transports} = require('winston'); //createLogger is a function that creates a logger instance, format is an object that contains the format functions, transports is an object that contains the transport functions
const {combine, timestamp, label, printf} = format; //combine is a function that combines the format functions, timestamp is a function that adds a timestamp to the log, label is a function that adds a label to the log, printf is a function that formats the log

const customFormat = printf(({level, message, label, timestamp})=>{
    return `${timestamp} : ${level}: ${message}`; //return a string that contains the timestamp, label, level and message
});

const logger = createLogger({
    format: combine(
        timestamp({format: 'YYYY-MM-DD HH:mm:ss'}), 
        customFormat
    ),
    transports: [
        new transports.Console(), //console transport is used to log the log to the console
        new transports.File({
            filename: 'Combined.log'
        })
    ]
});

module.exports = logger;