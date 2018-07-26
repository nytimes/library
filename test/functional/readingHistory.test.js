'use strict'

/* eslint-disable no-unused-expressions */

const request = require('supertest')
const {expect} = require('chai')

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

  it('GET /reading-history/docs.json succeeds', (done) => {
    request(app)
      .get('/reading-history/docs.json')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err)
        const json = JSON.parse(res.text)
        expect(json).to.have.keys('recentlyViewed', 'mostViewed')
        done()
      })
  })

  it('GET /reading-history/docs.json has correct docs', (done) => {
    request(app)
      .get('/reading-history/docs.json')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err)
        const {recentlyViewed, mostViewed} = JSON.parse(res.text)
        const recentIds = recentlyViewed.map((obj) => obj.documentId)
        const mostIds = mostViewed.map((obj) => obj.documentId)
        expect(recentIds).to.include(
          'xxxxxJ7S71V0K0z_P6XvDkdh4aIYO8AbMeVjfXDxxxxxJFbiE',
          'xxxxxZjvhyI8uWoQpCFRmdLrLc5yyD1sjEVCkFrxxxxxdU6JQ',
          'xxxxxhd7b-l4h2N3JfjOtxkudx1Zs0M9g09RporxxxxxBq6z8',
          'xxxxxlLU3WQO9D_BmsCHu0R8teQwiRfNRPRl8AlxxxxxjaVts'
        )
        expect(mostIds).to.include(
          'xxxxxJ7S71V0K0z_P6XvDkdh4aIYO8AbMeVjfXDxxxxxJFbiE',
          'xxxxxZjvhyI8uWoQpCFRmdLrLc5yyD1sjEVCkFrxxxxxdU6JQ',
          'xxxxxhd7b-l4h2N3JfjOtxkudx1Zs0M9g09RporxxxxxBq6z8'
        )
        done()
      })
  })
})
