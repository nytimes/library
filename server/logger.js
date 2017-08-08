'use strict'

const winston = require('winston')

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: !process.env.NODE_ENV,
      prettyPrint: true
    })
  ]
})

module.exports = logger
