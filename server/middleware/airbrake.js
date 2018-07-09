'use strict'

function initAirbrake() {
  const airbrake = require('airbrake')

  const client = airbrake.createClient(
    process.env.AIRBRAKE_PROJECT_ID,
    process.env.AIRBRAKE_API_KEY
  )

  client.addFilter((notice) => {
    // Don't report 404s to Airbrake
    if (notice.errors[0].message === 'Not found') {
      return null
    }
    return notice
  })
  return client
}

// error functions are special. They have to be attached directly to the app.
module.exports = process.env.AIRBRAKE_PROJECT_ID
  ? initAirbrake().expressHandler()
  : (res, req, next) => next() // empty airbrake code
