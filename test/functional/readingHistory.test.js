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

  describe('GET /reading-history/docs.json', () => {
    it('should succeed', () => {
      return request(app)
        .get('/reading-history/docs.json')
        .expect(200)
        .then((res) => {
          const json = JSON.parse(res.text)
          expect(json).to.have.keys('recentlyViewed', 'mostViewed')
        })
    })

    it('should have correct docs', () => {
      return request(app)
        .get('/reading-history/docs.json')
        .expect(200)
        .then((res) => {
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
        })
    })

    it('should have correct recent doc info', () => {
      return request(app)
        .get('/reading-history/docs.json')
        .expect(200)
        .then((res) => {
          const {recentlyViewed} = JSON.parse(res.text)
          const {doc} = recentlyViewed.filter(({documentId}) => {
            return documentId === 'xxxxxJ7S71V0K0z_P6XvDkdh4aIYO8AbMeVjfXDxxxxxJFbiE'
          })[0]
          expect(doc.id).equals('xxxxxJ7S71V0K0z_P6XvDkdh4aIYO8AbMeVjfXDxxxxxJFbiE')
          expect(doc.name).equals('Article in recently viewed | tagtest')
          expect(doc.prettyName).equals('Article in recently viewed')
          expect(doc.mimeType).equals('application/vnd.google-apps.document')
          expect(doc.tags).to.include('tagtest')
          expect(doc.slug).equals('article-in-recently-viewed')
        })
    })

    it('should have correct most viewed doc info', () => {
      return request(app)
        .get('/reading-history/docs.json')
        .expect(200)
        .then((res) => {
          const {recentlyViewed} = JSON.parse(res.text)
          const {doc} = recentlyViewed.filter(({documentId}) => {
            return documentId === 'xxxxxZjvhyI8uWoQpCFRmdLrLc5yyD1sjEVCkFrxxxxxdU6JQ'
          })[0]
          expect(doc.id).equals('xxxxxZjvhyI8uWoQpCFRmdLrLc5yyD1sjEVCkFrxxxxxdU6JQ')
          expect(doc.name).equals('Article IoHwo')
          expect(doc.prettyName).equals('Article IoHwo')
          expect(doc.mimeType).equals('application/vnd.google-apps.document')
          expect(doc.tags).to.be.empty
          expect(doc.slug).equals('article-iohwo')
        })
    })
  })

  describe('GET /reading-history/teams.json', () => {
    it('should succeed', () => {
      return request(app)
        .get('/reading-history/teams.json')
        .expect(200)
        .then((res) => {
          const json = JSON.parse(res.text)
          expect(json).to.have.keys('recentlyViewed', 'mostViewed')
        })
    })

    it('should have correct teams', () => {
      return request(app)
        .get('/reading-history/teams.json')
        .expect(200)
        .then((res) => {
          const {recentlyViewed, mostViewed} = JSON.parse(res.text)
          const recentIds = recentlyViewed.map((obj) => obj.teamId)
          const mostIds = mostViewed.map((obj) => obj.teamId)
          expect(recentIds).to.include(
            'xxxxxbiOr5xN_Z3RpbERYdnxxxxxd1TDQ',
            'xxxxxCF5lovN5fv1FY5JGMHChB7Ixxxxxn7sSX',
            'xxxxxHdNDs0WL7UROAgvR6PpeOQ4xxxxxbzc85',
            'xxxxxJOeJisUARNajc1er77iUqbRxxxxx1JLRT',
            'xxxxxyeFAwx1EW0VNs3yVacUXRVoxxxxxsV21W'
          )
          expect(mostIds).to.include(
            'xxxxxbiOr5xN_Z3RpbERYdnxxxxxd1TDQ',
            'xxxxxCF5lovN5fv1FY5JGMHChB7Ixxxxxn7sSX',
            'xxxxxHdNDs0WL7UROAgvR6PpeOQ4xxxxxbzc85',
            'xxxxxJOeJisUARNajc1er77iUqbRxxxxx1JLRT',
            'xxxxxyeFAwx1EW0VNs3yVacUXRVoxxxxxsV21W'
          )
        })
    })

    it('should have correct recent team info', () => {
      return request(app)
        .get('/reading-history/teams.json')
        .expect(200)
        .then((res) => {          const {recentlyViewed} = JSON.parse(res.text)
          const {team} = recentlyViewed.filter(({teamId}) => {
            return teamId === 'xxxxxCF5lovN5fv1FY5JGMHChB7Ixxxxxn7sSX'
          })[0]
          expect(team.id).equals('xxxxxCF5lovN5fv1FY5JGMHChB7Ixxxxxn7sSX')
          expect(team.name).equals('Team Folder 2 | team')
          expect(team.prettyName).equals('Team Folder 2')
          expect(team.mimeType).equals('application/vnd.google-apps.folder')
          expect(team.tags).to.include('team')
          expect(team.slug).equals('team-folder-2')
        })
    })
  })
})
