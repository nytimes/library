'use strict'

const inflight = require('inflight')
const google = require('googleapis')
const auth = require(process.env.AUTH_PATH || './.auth.json')
let authClient = null

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

  google.auth.fromJSON(auth, (err, client) => {
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
