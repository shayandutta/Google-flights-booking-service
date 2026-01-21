const express = require('express');

const apiRoutes = require('./routes')   //named import from the routes directory index.js file

const {ServerConfig, Logger} =require('./config') //if importing an index.js file, we can omit the index.js from the path, as long as we import from the directory name.

const CRONS = require('./utils/common/cron-jobs');

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/api' , apiRoutes);

app.listen(ServerConfig.PORT, ()=>{
    console.log(`Server is running on port ${ServerConfig.PORT}`);
    CRONS();
    // Logger.info("successfully started the server", {}); //info -> level, message -> message to log, label -> label to log, timestamp -> timestamp to log
})
