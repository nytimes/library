'use strict'

const inflight = require('inflight')
const google = require('googleapis')
const fs = require('fs')
let authClient = null

// In local development, look for an auth.json file.
if(!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log("GOOGLE_APPLICATION_CREDENTIALS was undefined, using default ./auth.json credentials file...")
  process.env.GOOGLE_APPLICATION_CREDENTIALS = './.auth.json'
}

// only public method, returns the authClient that can be used for making other requests
exports.getAuth = (cb) => {
  if (authClient) {
    return cb(null, authClient)
  }

  setAuthClient(cb)
}

// configures the auth client if we don't already have one
function setAuthClient(cb) {
  cb = inflight('auth', cb)
  // guard against calling while already in progress
  if (!cb) return

  google.auth.getApplicationDefault((err, client) => {
    if (err) {
      return cb(err)
    }

    authClient = client
    if (authClient.createScopedRequired && authClient.createScopedRequired()) {
      authClient = authClient.createScoped([
        'https://www.googleapis.com/auth/drive'
      ])
    }

    console.log('auth successfully retreived.')
    cb(null, authClient)
  })
}
