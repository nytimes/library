'use strict'

const request = require('supertest-as-promised')
const assert = require('assert')
const bluebird = require('bluebird')
const moment = require('moment')
const express = require('express')

const {f} = require('../../utils')
const {middleware: cache, add, purge} = require('../../../server/cache')
const purgePromise = bluebird.promisify(purge)
const addPromise = bluebird.promisify(add)

const server = express()
server.use(cache)

const sampleEntry = {
  id: 'some_id',
  modified: moment(0).format(), // this should be an actual date
  path: '/parent/sample-entry',
  html: 'cached html'
}
const {id, modified, path, html} = sampleEntry

let count = 0
const nextModified = () => {
  count += 1
  return moment(modified).add(count, 'days').format()
}

// can we run against cache explicitly?
describe('the cache', f((mocha) => {
  beforeEach(f((mocha) => {
    return purgePromise({url: path, modified: nextModified()})
      .catch((err) => {}) // silence errors from purging when empty
      .then(() => {
        return addPromise(id, nextModified(), path, html) // this is a noop
      })
  }))

  it('should return items that have been stored', f((mocha) => {
    return request(server)
      .get(path)
      .expect(200)
      .then((res) => {
        assert.equal(res.text, html, 'the returned html should match what was cached')
      })
  }))

  it('should successfully purge items on demand', f((mocha) => {
    mocha.timeout(10000) // @TODO: investigate why this takes so long
    return request(server)
      .get(path)
      .expect(200)
      .then(() => {
        // why doesn't this purge work?
        // oh we need to purge by path now
        return purgePromise({url: path, modified: nextModified()})
          .catch((err) => {
            console.log('purging error!', err)
          })
      })
      .then(() => {
        return request(server)
          .get(path)
          .expect(404) // this might take a while without stubbing
      })
  }))

  // @TODO: add better test coverage for the cache
  // existing tests do not cover all cases
}))
