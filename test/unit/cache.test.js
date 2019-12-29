'use strict'

const request = require('supertest')
const moment = require('moment')
const sinon = require('sinon')
const {expect} = require('chai')

const {f} = require('../utils')
const cache = require('../../server/cache')

const app = require('../../server/index')

const sampleEntry = {
  id: 'Test7', // mocked document that maps to path below in the drive listing
  modified: moment(0).format(), // this should be an actual date
  path: '/test-folder-1/article-3-in-test-folder-1',
  html: 'cached html' // will be used to overwrite doc content for tests
}
const {id, modified, path, html} = sampleEntry

let count = 0
const nextModified = () => {
  count += 1
  return moment(modified).add(count, 'days').format()
}
const userInfo = {
  emails: [{value: 'test.user@test.com'}],
  id: '10',
  userId: '10',
  _json: {domain: 'test.com'}
}

const purgeCache = () => cache.purge({id, modified: nextModified(), ignore: 'all'})
const addCache = () => cache.add(id, nextModified(), {html})
const getCache = (url = path) => request(app).get(url)

// can we run against cache explicitly?
describe('The cache', f((mocha) => {
  beforeEach(() => sinon.stub(app.request, 'session').value({passport: {user: userInfo}}))

  describe('adding to the cache', f((mocha) => {
    beforeEach(f((mocha) => purgeCache))

    it('should not save if no modification time is passed', f((mocha) => {
      return cache.add(id, null, path, html)
        .catch((err) => expect(err).to.be.an('error'))
    }))

    it('should save successfully with valid data', f((mocha) => {
      return cache.add(id, nextModified(), path, html) // no error is returned
    }))
  }))

  describe('purging the cache', f((mocha) => {
    beforeEach(() => purgeCache().then(addCache))

    it('should succeed via the purge method', f(async (mocha) => {
      return getCache()
        .expect(200)
        .then(() => cache.purge({id, modified: nextModified()}))
        .then(async () => expect(await cache.get(id)).to.include.keys('purgeId'))
    }))

    it('should succeed via "purge" query param', f((mocha) => {
      return getCache()
        .query({purge: 1})
        .expect(200)
        .then(async () => expect(await cache.get(id)).to.include.keys('purgeId'))
    }))

    it('should succeed via "edit" query param', f((mocha) => {
      return getCache()
        .query({edit: 1})
        .expect(200)
        .then(async () => expect(await cache.get(id)).to.include.keys('noCache'))
    }))
  }))

  describe('saved html', f((mocha) => {
    beforeEach(() => purgeCache().then(addCache))

    it('should be returned when available', f((mocha) => {
      addCache()
      return getCache()
        .expect(200)
        .then((res) => expect(res.text).to.include(html))
    }))

    it('should not be returned when empty', f((mocha) => {
      return cache.purge({id, modified: nextModified()})
        .then(async () => expect(await cache.get(id)).to.include.keys('purgeId'))
    }))
  }))

  describe.skip('redirects', f((mocha) => {
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
