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

describe('Reading History', () => {
  before(() => {
    app.request.session = {passport: {user: userInfo}}
  })
  // it('GET /reading-history/docs.json', (done) => {
  //   request(app)
  //     .get('/reading-history/docs.json')
  //     // .expect(200)
  //     .end((err, res) => {
  //       console.log(err);
  //       if (err) return done(err)
  //       console.log(res.text);
  //       done()
  //     })
  // })
})
