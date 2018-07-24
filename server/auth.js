'use strict'

const path = require('path')

const inflight = require('promise-inflight')
const {google} = require('googleapis')
const {auth: nodeAuth} = require('google-auth-library')
const {promisify} = require('util')

const log = require('./logger')

let authClient = null

// Look for google application credentials as json env var
const credsInJSON = isJSON(process.env.GOOGLE_APPLICATION_CREDENTIALS)

// In local development, look for an auth.json file.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  log.warn('GOOGLE_APPLICATION_CREDENTIALS was undefined, using default ./auth.json credentials file...')
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '.auth.json')
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

  return inflight('auth', async () => {
    // In Heroku environment, set GOOGLE_APPLICATION_CREDENTIALS as auth json object to be parsed
    if (credsInJSON) {
      const keys = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      authClient = nodeAuth.fromJSON(keys);
      authClient.scopes = scopes

      await authClient.authorize()

    } else {
      const getGoogleAuth = promisify(google.auth.getApplicationDefault).bind(google.auth)
      const client = await getGoogleAuth()

      authClient = client
      if (authClient.createScopedRequired && authClient.createScopedRequired()) {
        authClient = authClient.createScoped(scopes)
      }
      google.options({auth: authClient})
    }

    cb(null, authClient)
    log.info('Google API auth successfully retrieved.')
  })
}

function isJSON(str) {
  try {
    const obj = JSON.parse(str)
    if (obj && typeof obj === 'object' && obj !== null) {
        return true
      }
  } catch (err) {}
    return false
}
