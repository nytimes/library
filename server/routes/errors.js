'use strict'

const express = require('express')
const airbrake = require('airbrake')

const router = express.Router()

if (process.env.AIRBRAKE_PROJECT_ID) {
  const client = initAirbrake()
  router.use(client)
}

// error handler for rendering the 404 and 500 pages
router.use((err, req, res, next) => {
  const code = err.message === 'Not found' ? 404 : 500
  console.log('Received an error!', err)
  res.status(code).render(`errors/${code}`, {err})
})

module.exports = router

function initAirbrake() {
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

// generic error handler to return error pages to user
