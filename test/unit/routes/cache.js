'use strict'

const request = require('supertest-as-promised')
const assert = require('assert')

const {f} = require('../../utils')
const server = require('../../../server')
const {middleware: cache, add, purge} = require('../../../server/cache')

const sampleEntry = {
  id: 'some_id',
  modified: '1234',
  path: '/parent/sample-entry',
  html: 'cached html'
}
const {id, modified, path, html} = sampleEntry

// can we run against cache explicitly?
describe('the cache', f((mocha) => {
  beforeEach(f((mocha) => {
    purge(id, '4321')
    add(id, modified, path, html)
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
    return request(server)
      .get(path)
      .expect(200)
      .then(() => {
        purge(id, '4321')
        return request(server)
          .get(path)
          .expect(404)
      })
  }))

  // @TODO: add better test coverage for the cache
  // existing tests do not cover all cases
}))
