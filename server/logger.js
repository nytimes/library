'use strict'

const winston = require('winston')

const transports = process.env.NODE_ENV === 'test'
? []
: [
  new (winston.transports.Console)({
    colorize: !process.env.NODE_ENV,
    prettyPrint: true
  })
]

module.exports = new (winston.Logger)({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  transports
})
