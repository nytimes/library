'use strict'

function initSentry() {
  const raven = require('raven')

  raven.config(process.env.SENTRY_DSN).install()
  return raven.requestHandler()
}

// error functions are special. They have to be attached directly to the app.
exports.preload = process.env.SENTRY_DSN
  ? initSentry()
  : (res, req, next) => next() // empty airbrake code
