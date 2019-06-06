'use strict'

const request = require('supertest')
const {assert} = require('chai')
const sinon = require('sinon')
const express = require('express')
const decache = require('decache')

const userInfo = {
  emails: [{value: 'test.user@test.com'}],
  id: '10',
  userId: '10',
  _json: {domain: 'test.com'}
}

describe('Trust Proxy', () => {
  describe('when trust proxy env is not true', () => {
    before(() => sinon.stub(express.request, 'isAuthenticated').returns(false))
    beforeEach(() => decache('../../server/index'))
    after(() => sinon.restore())
    // app moved inside tests so that it can be recreated later with different
    // environment variables setup.
    var app = require('../../server/index')


    it('redirect should be for http with no headers', () => {

      return request(app)
        .get('/login')
        .expect(302) // expect user to be found
        .then((res) => {
          assert(res.redirect)
          assert.include(res.headers.location, "redirect_uri=http%3A",'Redirect URI is http')
        })
    })

    it('redirect should be for http with headers but env not set', () => {
      return request(app)
        .get('/login')
        .set('X-Forwarded-Proto', 'https')
        .expect(302) // expect user to be found
        .then((res) => {
          assert(res.redirect)
          assert.include(res.headers.location, "redirect_uri=http%3A",'Redirect URI is http')
        })
    })
    //app.server.close()
  })

  describe('when trust proxy env is not true', () => {
    before(() => sinon.stub(express.request, 'isAuthenticated').returns(false))
    beforeEach(() => decache('../../server/index'))
    after(() => sinon.restore())
    // app moved inside tests so that it can be recreated later with different
    // environment variables setup.




    it('redirect should be for http with no headers', () => {
      process.env.TRUST_PROXY = "true"
      var app = require('../../server/index')
      return request(app)
        .get('/login')
        .expect(302) // expect user to be found
        .then((res) => {
          assert(res.redirect)
          assert.include(res.headers.location, "redirect_uri=http%3A",'Redirect URI is http')
        })
    })

    it('redirect should be for https with headers and env set', () => {
      process.env.TRUST_PROXY = "true"
      var app = require('../../server/index.js')
      return request(app)
        .get('/login')
        .set('X-Forwarded-Proto', 'https')
        .expect(302) // expect user to be found
        .then((res) => {
          assert(res.redirect)
          assert.include(res.headers.location, "redirect_uri=https%3A",'Redirect URI is https')
        })
    })
  })


})
