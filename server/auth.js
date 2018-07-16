'use strict'

const path = require('path')

const inflight = require('inflight')
const {google} = require('googleapis')
const {auth} = require('google-auth-library')

const log = require('./logger')

let authClient = null

// In local development, look for an auth.json file.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  log.warn('GOOGLE_APPLICATION_CREDENTIALS was undefined, using default ./auth.json credentials file...')
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '.auth.json')
}

const keysEnvVar = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!keysEnvVar) {
  log.error('GOOGLE_APPLICATION_CREDENTIALS was not defined!')
}
const keys = JSON.parse(keysEnvVar)

async function main() {
  // load the JWT or UserRefreshClient from the keys
  const client = auth.fromJSON(keys);
  client.scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/cloud-platform', 
    'https://www.googleapis.com/auth/datastore'
  ]
  await client.authorize()

  console.log(Object.keys(client))
  // const url = `https://www.googleapis.com/dns/v1/projects/${keys.project_id}`;
  // const res = await client.request({url});

  // console.log(res)
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
  cb = inflight('auth', cb)
  // guard against calling while already in progress
  if (!cb) return
  
  const client = auth.fromJSON(keys);
  client.scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/cloud-platform', 
    'https://www.googleapis.com/auth/datastore'
  ]
  await client.authorize()

  cb(null, client)

  // google.auth.getApplicationDefault((err, client) => {
  //   if (err) {
  //     return cb(err)
  //   }

  //   authClient = client
  //   if (authClient.createScopedRequired && authClient.createScopedRequired()) {
  //     authClient = authClient.createScoped([
  //       'https://www.googleapis.com/auth/drive',
  //       'https://www.googleapis.com/auth/cloud-platform',
  //       'https://www.googleapis.com/auth/datastore'
  //     ])
  //   }
  //   google.options({auth: authClient})
  //   log.info('Google API auth successfully retrieved.')
  //   cb(null, authClient)
  // })
}

main().catch(console.error)
