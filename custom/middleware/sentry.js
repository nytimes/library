// 'use strict'

// const raven = require('raven')

// function initSentry() {
//   raven.config(process.env.SENTRY_DSN).install()
//   return raven.requestHandler()
// }

// // error functions are special. They have to be attached directly to the app.
// exports.preload = process.env.SENTRY_DSN
//   ? initSentry()
//   : (res, req, next) => next() // pass if no sentry env variable

// exports.postload = process.env.SENTRY_DSN
//   ? raven.errorHandler()
//   : (res, req, next) => next() // pass if no sentry env variable
