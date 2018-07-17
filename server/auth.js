'use strict'

const path = require('path')

const inflight = require('inflight')
const {google} = require('googleapis')
const {auth: herokuAuth} = require('google-auth-library')

const log = require('./logger')

let authClient = null

// In local development, look for an auth.json file.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  log.warn('GOOGLE_APPLICATION_CREDENTIALS was undefined, using default ./auth.json credentials file...')
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '.auth.json')
} 

// In Heroku environment, set GOOGLE_APPLICATION_CREDENTIALS as auth json object to be parsed
if (process.env.HEROKU) {
  const keysEnvVar = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!keysEnvVar) {
    log.error('GOOGLE_APPLICATION_CREDENTIALS was not defined. Set the config var object in Heroku.')
  }
  const keys = JSON.parse(keysEnvVar)
}


// only public method, returns the authClient that can be used for making other requests
exports.getAuth = (cb) => {
  if (authClient) {
    return cb(null, authClient)
  }

  setAuthClient(cb)
}

// configures the auth client if we don't already have one
async function setAuthClient(cb) {
  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/cloud-platform', 
    'https://www.googleapis.com/auth/datastore'
  ]

  cb = inflight('auth', cb)
  // guard against calling while already in progress
  if (!cb) return

  if (process.env.HEROKU) {
    authClient = auth.fromJSON(keys);
    authClient.scopes = scopes
    await authClient.authorize()

  } else {
    google.auth.getApplicationDefault((err, client) => {
      if (err) {
        return cb(err)
      }

      authClient = client
      if (authClient.createScopedRequired && authClient.createScopedRequired()) {
        authClient = authClient.createScoped(scopes)
      }

      google.options({auth: authClient})
      log.info('Google API auth successfully retrieved.')
    })
  }

  cb(null, authClient)
}
