'use strict'

const http = require('http')
const nock = require('nock')

const listing = require('../fixtures/driveListing')

// a helper to allow arrow functions with mocha
exports.f = (cb) => {
  return function () {
    return cb(this) // eslint-disable-line standard/no-callback-literal
  }
}

// inspect & log info about http requests for mocking
exports.inspectHttp = () => {
  const originalRequest = http.request
  http.request = (...args) => {
    const [opts] = args
    console.log(`${opts.method}: ${opts.proto}://${opts.host}${opts.path}`)
    const req = originalRequest.apply(http, args)
    req.on('close', (...args) => {
      console.log(args)
    })
    return req
  }

  // return a function that puts the original request method back
  return function restore() {
    http.request = originalRequest
  }
}

exports.allFilenames = [].concat(...Object.keys(listing).map((pageName, i) => {
  // map each mock page listing to an array of non-folder file names, strip tags
  return listing[pageName].data.files.reduce((acc, {mimeType, name}) => {
    if (!mimeType.includes('folder') && !name.includes('| hidden')) acc.push(name.split(' | ')[0])
    return acc
  }, [])
}))

nock('accounts.google.com')
  .get('*')
  .reply(200)

nock('www.google.apis.com')
  .get('*')
  .reply(200)
