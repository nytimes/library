'use strict'

const request = require('supertest')
const assert = require('assert')
const moment = require('moment')
const express = require('express')

const {f} = require('../utils')
const cache = require('../../server/cache')

const server = express()
server.use(cache.middleware)

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

const purgeCache = async () => cache.purge({url: path, modified: nextModified(), ignore: 'all'})
const addCache = async () => cache.add(id, nextModified(), path, html)
const getCache = (url = path) => request(server).get(url)

// can we run against cache explicitly?
describe('The cache', f((mocha) => {
  describe('adding to the cache', f((mocha) => {
    beforeEach(f((mocha) => purgeCache))

    it('should not save if no modification time is passed', f((mocha) => {
      return cache.add(id, null, path, html)
        .catch((err) => assert(err, 'an error is returned'))
    }))

    it('should save successfully with valid data', f((mocha) => {
      return cache.add(id, nextModified(), path, html) // no error is returned
    }))
  }))

  describe('purging the cache', f((mocha) => {
    beforeEach(() => purgeCache().then(addCache))

    it('should succeed via the purge method', f((mocha) => {
      return getCache()
        .expect(200)
        .then(() => cache.purge({url: path, modified: nextModified()}))
        .then(() => getCache().expect(404))
    }))

    it('should succeed via "purge" query param', f((mocha) => {
      return getCache()
        .query({purge: 1})
        .expect(200)
        .then(() => getCache().expect(404))
    }))

    it('should succeed via "edit" query param', f((mocha) => {
      return getCache()
        .query({edit: 1})
        .expect(200)
        .then(() => getCache().expect(404))
    }))
  }))

  describe('saved html', f((mocha) => {
    beforeEach(() => purgeCache().then(addCache))

    it('should be returned when available', f((mocha) => {
      return getCache()
        .expect(200)
        .then((res) => {
          assert.equal(res.text, html, 'the returned html should match what was cached')
        })
    }))

    it('should not be returned when empty', f((mocha) => {
      return cache.purge({ url: path, modified: nextModified() })
        .then(() => getCache().expect(404))
    }))
  }))

  describe('redirects', f((mocha) => {
    beforeEach(() => purgeCache().then(addCache))

    it('should save redirects when valid', f((mocha) => {
      const newPath = '/parent/sample-entry-2'
      return cache.redirect(path, newPath, modified)
        // check the redirect saved
        .then(() => getCache().expect(302).expect('Location', newPath))
        // and that cache was purged at the destination
        .then(() => getCache(newPath).expect(404))
    }))
  }))
}))
