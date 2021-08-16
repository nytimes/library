'use strict'
const request = require('supertest')
const {assert} = require('chai')
const sinon = require('sinon')
const express = require('express')
const log = require('../../server/logger')
const app = require('../../server/index')

/*
  These users' emails correspond to the `APPROVED_DOMAINS`
  for the session set up in `bootstrap.js`
*/
const userInfo = {
  emails: [{value: 'test.user@test.com'}],
  id: '10',
  userId: '10'
}

const regexUser = {
  emails: [{value: 'unique@foobar.org'}],
  id: '11',
  userId: '11'
}

const specificUser = {
  emails: [{value: 'demo.user@demo.site.edu'}],
  id: '12',
  userId: '12'
}

const unauthorizedUser = {
  emails: [{value: 'unauth@unauthorized.com'}],
  id: '13',
  userId: '13'
}

describe('Authentication', () => {
  describe('.env specified oauth strategy', () => {
    const sandbox = sinon.createSandbox()
    beforeEach(() => {
      jest.resetModules()
      sandbox.stub(express.request, 'isAuthenticated').returns(false)
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('should warn if there is an invalid strategy specified', () => {
      process.env.OAUTH_STRATEGY = 'fakjkjfdz'
      const spy = sandbox.spy(log, 'warn')
      const appWithInvalidOauth = require('../../server/index') // need to redo app setup
      return request(appWithInvalidOauth)
        .get('/login')
        .expect(302)
        .then((res) => {
          assert.isTrue(spy.called, 'warn was not called')
          assert.match(res.headers.location, /google/)
        })
    })

    it('should default to google if there is no auth strategy specified', () => {
      process.env.OAUTH_STRATEGY = undefined
      const appWithoutOauth = require('../../server/index') // need to redo app setup
      return request(appWithoutOauth)
        .get('/login')
        .expect(302)
        .then((res) => {
          assert.match(res.headers.location, /google/)
        })
    })

    it('should use slack strategy if slack is specified', () => {
      process.env.OAUTH_STRATEGY = 'Slack'
      process.env.SLACK_CLIENT_ID = '1234567890'
      process.env.SLACK_CLIENT_SECRET = '1234567890'
      const appWithSlackAuth = require('../../server/index') // need to redo app setup
      return request(appWithSlackAuth)
        .get('/login')
        .expect(302)
        .then((res) => {
          assert.match(res.headers.location, /slack/)
        })
    })

    it('Slack has to be capitalized, sorry', () => {
      process.env.OAUTH_STRATEGY = 'slack'
      const appWithSlackAuth = require('../../server/index') // need to redo app setup
      return request(appWithSlackAuth)
        .get('/login')
        .expect(302)
        .then((res) => {
          assert.match(res.headers.location, /google/)
        })
    })
  })

  describe('when not logged in', () => {
    beforeAll(() => sinon.stub(express.request, 'isAuthenticated').returns(false))
    afterAll(() => sinon.restore())

    it('should redirect to login if unauthenticated at homepage', () => {
      return request(app)
        .get('/')
        .expect(302) // expect user to be found
        .then((res) => {
          assert(res.redirect)
          assert.equal(res.text, 'Found. Redirecting to /login')
        })
    })

    it('should redirect to login if unauthenticated at path', () => {
      return request(app)
        .get('/foo/bar')
        .expect(302)
        .then((res) => {
          assert(res.redirect)
          assert.equal(res.text, 'Found. Redirecting to /login')
        })
    })
  })

  describe('when logging in with regex-approved domain', () => {
    beforeAll(() => {
      sinon.stub(app.request, 'session').value({passport: {user: regexUser}})
      sinon.stub(express.request, 'user').value(regexUser)
      sinon.stub(express.request, 'userInfo').value(regexUser)
    })
    afterAll(() => sinon.restore())

    it('should check for regex domains in APPROVED_DOMAINS', () => {
      return request(app)
        .get('/')
        .expect(200)
    })
  })

  describe('when logging in with specified email address', () => {
    beforeAll(() => {
      sinon.stub(app.request, 'session').value({passport: {user: specificUser}})
      sinon.stub(express.request, 'user').value(specificUser)
      sinon.stub(express.request, 'userInfo').value(specificUser)
    })
    afterAll(() => sinon.restore())

    it('should check for individual emails in APPROVED_DOMAINS', () => {
      return request(app)
        .get('/')
        .expect(200)
    })
  })

  describe('when logging in with unauthorized domain/email', () => {
    beforeAll(() => {
      sinon.stub(app.request, 'session').value({passport: {user: unauthorizedUser}})
      sinon.stub(express.request, 'user').value(unauthorizedUser)
      sinon.stub(express.request, 'userInfo').value(unauthorizedUser)
    })
    afterAll(() => sinon.restore())

    it('should reject unauthorized user', () => {
      return request(app)
        .get('/')
        .expect(403)
    })
  })

  describe('when logged in', () => {
    beforeAll(() => sinon.stub(app.request, 'session').value({passport: {user: userInfo}}))
    afterAll(() => sinon.restore())

    it('should return correct information at /whoami.json', () => {
      return request(app)
        .get('/whoami.json')
        .expect(200) // expect user to be found
        .expect('Content-Type', /json/)
        .then((res) => {
          const whoami = JSON.parse(JSON.stringify(res.body))
          assert.equal(whoami.email, 'test.user@test.com')
          assert.equal(whoami.userId, '10')
          assert.equal(whoami.analyticsUserId, 'asdfjkl123library')
        })
    })

    it('should redirect to / after logout', () => {
      return request(app)
        .get('/logout')
        .expect(302)
        .then((res) => {
          assert(res.redirect)
          assert.equal(res.text, 'Found. Redirecting to /')
        })
    })
  })
})
