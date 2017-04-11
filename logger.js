'use strict'
var winston = require('winston')

winston.loggers.add('information', {
  console: {
    level: 'info',
    colorize: true
  },
  file: {
    json: false,
    filename: 'idas-opcua-agent.log',
    level: 'debug'
  }
})
winston.loggers.add('result', {
  file: {
    json: false,
    filename: 'result.log',
    level: 'debug'
  }
})

var log = winston.loggers.get('information')
var logResult = winston.loggers.get('result')

var logger = {
  debug: function (data, metadata, result) {
    log.log('debug', data, metadata)
    if (result) { logResult.log('debug', data, metadata) }
  },
  info: function (data, metadata, result) {
    log.log('info', data, metadata)
    if (result) { logResult.log('info', data, metadata) }
  },
  warn: function (data, metadata, result) {
    log.log('warn', data, metadata)
    if (result) { logResult.log('warn', data, metadata) }
  },
  error: function (data, metadata, result) {
    log.log('error', data, metadata)
    if (result) { logResult.log('error', data, metadata) }
  }
}
module.exports = logger
