"use strict";
var winston = require('winston');
var log = new winston.Logger({
    level: 'debug',
    transports: [
        new(winston.transports.Console)(),
        new(winston.transports.File)({
            filename: 'idas-opcua-agent.log'
        }) //TODO
    ]
});

var logger = {
    debug: function (data, metadata) {
        log.log("debug", data, metadata);
    },
    info: function (data, metadata) {
        log.log("info", data, metadata);
    },
    warn: function (data, metadata) {
        log.log("warn", data, metadata);
    },
    error: function (data, metadata) {
        log.log("error", data, metadata);
    }
};
module.exports = logger;