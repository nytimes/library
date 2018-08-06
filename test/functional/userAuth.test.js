'use strict'

const request = require('supertest')
const {assert} = require('chai')
const sinon = require('sinon')
const express = require('express')

const app = require('../../server/index')

const userInfo = {
  emails: [{value: 'test.user@test.com'}],
  id: '10',
  userId: '10',
  _json: {domain: 'test.com'}
}

describe('Authentication', () => {
  describe('when not logged in', () => {
    let authStub
    before(() => {
      authStub = sinon.stub(express.request, 'isAuthenticated').returns(false)
    })
    after(() => authStub.restore())

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

  describe('when logged in', () => {
    let sessionStub
    before(() => {
      sessionStub = sinon.stub(app.request, 'session').get(() => {
        return {passport: {user: userInfo}}
      })
    })
    after(() => sessionStub.restore())

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
        .expect(302) // expect user to be found
        .then((res) => {
          assert(res.redirect)
          assert.equal(res.text, 'Found. Redirecting to /')
        })
    })
  })
})
