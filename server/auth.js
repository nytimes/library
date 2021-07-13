'use strict'

const path = require('path')

const inflight = require('promise-inflight')
const {google} = require('googleapis')
const {
  auth,
  GoogleAuth
} = require('google-auth-library')

const log = require('./logger')

let authClient = null

// In local development, look for an .auth.json file.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.NODE_ENV === 'development') {
  log.warn('GOOGLE_APPLICATION_CREDENTIALS was undefined, using default ./.auth.json credentials file...')
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '.auth.json')
}

// only public method, returns the authClient that can be used for making other requests
exports.getAuth = async () => {
  if (authClient && process.env.NODE_ENV !== 'test') return authClient
  return setAuthClient()
}

// configures the auth client if we don't already have one
async function setAuthClient() {
  return inflight('auth', async () => {
    const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

    // In Heroku environment, set GOOGLE_APPLICATION_CREDENTIALS to 'parse_json' to avoid introducing new file
    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/datastore'
    ]
    // see https://github.com/googleapis/google-auth-library-nodejs#loading-credentials-from-environment-variables
    if (credentialPath === 'parse_json') {
      log.info('Trying to parse client credentials via GOOGLE_APPLICATION_JSON.')
      const keys = JSON.parse(process.env.GOOGLE_APPLICATION_JSON)
      authClient = auth.fromJSON(keys)
      authClient.scopes = scopes
    } else {
      // if .auth.json file exists, google will find it automatically https://github.com/googleapis/google-auth-library-nodejs#choosing-the-correct-credential-type-automatically
      const googleAuth = new GoogleAuth({scopes})
      authClient = await googleAuth.getClient()
    }
    google.options({auth: authClient})
    log.info('Google API auth successfully retrieved.')

    return authClient
  })
}
