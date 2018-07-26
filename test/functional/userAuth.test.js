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

describe('Authentication', () => { // COMBAK
  /*
  describe('when not logged in', () => {
    before(() => {
      express.request.user = {}
      express.request.userInfo = {}
    })

    it('GET / should redirect to login if unauthenticated', (done) => {
      request(app)
        .get('/')
        .expect(302) // expect user to be found
        .end((err, res) => {
          if (err) return done(err)
          assert(res.redirect)
          assert.equal(res.text, 'Found. Redirecting to /login')
          done()
        })
    })

    it('GET a path should redirect to login if unauthenticated', (done) => {
      request(app)
        .get('/foo/bar')
        .expect(302)
        .end((err, res) => {
          if (err) return done(err)
          assert(res.redirect)
          assert.equal(res.text, 'Found. Redirecting to /login')
          done()
        })
    })
  })
*/
  describe('when logged in', () => {
    before(() => {
      express.request.user = userInfo
      express.request.userInfo = {
        email: 'test.user@test.com',
        userId: '10',
        analyticsUserId: 'asdfjkl123library'
      }
      app.request.session = {passport: {user: userInfo}}
    })

    it('GET /whoami.json should return correct information', (done) => {
      request(app)
        .get('/whoami.json')
        .expect(200) // expect user to be found
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(err)
          const whoami = JSON.parse(JSON.stringify(res.body))
          assert.equal(whoami.email, 'test.user@test.com')
          assert.equal(whoami.userId, '10')
          assert.equal(whoami.analyticsUserId, 'asdfjkl123library')
          done()
        })
    })

    it('GET /logout should redirect to /', (done) => {
      request(app)
        .get('/logout')
        .expect(302) // expect user to be found
        .end((err, res) => {
          if (err) return done(err)
          assert(res.redirect)
          assert.equal(res.text, 'Found. Redirecting to /')
          done()
        })
    })
  })
})
