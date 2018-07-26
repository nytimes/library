'use strict'

/* eslint-disable no-unused-expressions */

const request = require('supertest')
const {expect} = require('chai')
const express = require('express')

const app = require('../../server/index')

const userInfo = {
  emails: [{value: 'test.user@test.com'}],
  id: '10',
  userId: '10',
  _json: {domain: 'test.com'}
}

describe('Page getting', () => {
  before(() => {
    app.request.session = {passport: {user: userInfo}}
  })
  describe('Endpoints', () => {
    it('GET /', (done) => {
      request(app)
        .get('/')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err)
          expect(res.text).to.include('Find by Team')
          expect(res.text).to.include('Useful Docs')
          done()
        })
    })

    it('GET /test-folder', (done) => {
      request(app)
        .get('/test-folder')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err)
          // check it resolves name correclty
          expect(res.text).to.include('Pages in Test Folder')
          // check it has links to children
          expect(res.text).to.include('Article 1 in test folder')
          expect(res.text).to.include('Article 2 in test folder')

          // console.log(res.text)
          done()
        })
    })

  })
})
