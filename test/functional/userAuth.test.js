'use strict'

const request = require('supertest')
const {assert} = require('chai')
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
    before(() => {
      express.request.user = {}
      express.request.userInfo = {}
      express.request.isAuthenticated = () => false
    })

    after(() => {
      express.request.user = userInfo
      express.request.userInfo = {
        email: 'test.user@test.com',
        userId: '10',
        analyticsUserId: 'asdfjkl123library'
      }
      app.request.session = {passport: {user: userInfo}}
      express.request.isAuthenticated = () => true
    })

    it('GET / should redirect to login if unauthenticated', () => {
      return request(app)
        .get('/')
        .expect(302) // expect user to be found
        .then((res) => {
          assert(res.redirect)
          assert.equal(res.text, 'Found. Redirecting to /login')
        })
    })

    it('GET a path should redirect to login if unauthenticated', () => {
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
    it('GET /whoami.json should return correct information', () => {
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

    it('GET /logout should redirect to /', () => {
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
