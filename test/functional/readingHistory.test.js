'use strict'

const request = require('supertest')
const {expect} = require('chai')
const sinon = require('sinon')

const app = require('../../server/index')

const userInfo = {
  emails: [{value: 'test.user@test.com'}],
  id: '10',
  userId: '10',
  _json: {domain: 'test.com'}
}

describe('Reading History', () => {
  let sessionStub
  before(() => {
    sessionStub = sinon.stub(app.request, 'session').value({passport: {user: userInfo}})
  })
  after(() => sessionStub.restore())

  describe('for documents', () => {
    it('should return 200 with json', () => {
      return request(app)
        .get('/reading-history/docs.json')
        .set('Accept', 'application/json')
        .expect(200)
        .then((res) => {
          expect(res.body).to.have.keys('recentlyViewed', 'mostViewed')
        })
    })

    it('should have correct docs', () => {
      return request(app)
        .get('/reading-history/docs.json')
        .set('Accept', 'application/json')
        .expect(200)
        .then((res) => {
          const {recentlyViewed, mostViewed} = res.body
          const recentIds = recentlyViewed.map((obj) => obj.documentId)
          const mostIds = mostViewed.map((obj) => obj.documentId)
          expect(recentIds).to.include(
            '8135b90bcc7085a0daa231d9a1109b5c',
            '88ca5e30ddb527b4e6266deeef78bff7',
            'b5a16aaa74bd7e3354f87bd4fa531010',
            'e2536944549231810b2863405fca90ca'
          )
          expect(mostIds).to.include(
            '8135b90bcc7085a0daa231d9a1109b5c',
            '88ca5e30ddb527b4e6266deeef78bff7',
            'b5a16aaa74bd7e3354f87bd4fa531010'
          )
        })
    })

    it('should have correct recent doc info', () => {
      return request(app)
        .get('/reading-history/docs.json')
        .set('Accept', 'application/json')
        .expect(200)
        .then((res) => {
          const {recentlyViewed} = res.body
          const {doc} = recentlyViewed.filter(({documentId}) => {
            return documentId === '8135b90bcc7085a0daa231d9a1109b5c'
          })[0]
          expect(doc.id).equals('8135b90bcc7085a0daa231d9a1109b5c')
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
        .set('Accept', 'application/json')
        .expect(200)
        .then((res) => {
          const {recentlyViewed} = res.body
          const {doc} = recentlyViewed.filter(({documentId}) => {
            return documentId === '88ca5e30ddb527b4e6266deeef78bff7'
          })[0]
          expect(doc.id).equals('88ca5e30ddb527b4e6266deeef78bff7')
          expect(doc.name).equals('Article IoHwo')
          expect(doc.prettyName).equals('Article IoHwo')
          expect(doc.mimeType).equals('application/vnd.google-apps.document')
          expect(doc.tags).to.be.empty // eslint-disable-line no-unused-expressions
          expect(doc.slug).equals('article-iohwo')
        })
    })
  })

  describe('for teams', () => {
    it('should return 200 with json', () => {
      return request(app)
        .get('/reading-history/teams.json')
        .expect(200)
        .set('Accept', 'application/json')
        .then((res) => {
          expect(res.body).to.have.keys('recentlyViewed', 'mostViewed')
        })
    })

    it('should have correct teams', () => {
      return request(app)
        .get('/reading-history/teams.json')
        .set('Accept', 'application/json')
        .expect(200)
        .then((res) => {
          const {recentlyViewed, mostViewed} = res.body
          const recentIds = recentlyViewed.map((obj) => obj.teamId)
          const mostIds = mostViewed.map((obj) => obj.teamId)
          expect(recentIds).to.include(
            'a370ee8b7d07b9d2d144740083f9dd10',
            '6478ec336324a91b837acf752d7babc4',
            '886297c1fad89a90244cfe6587d2fcd8',
            '24e88e5e2ed1f3a42c7884da046ef6ed',
            'e958268cc71fad1faa4a84df0e4aff2b'
          )
          expect(mostIds).to.include(
            'a370ee8b7d07b9d2d144740083f9dd10',
            '6478ec336324a91b837acf752d7babc4',
            '886297c1fad89a90244cfe6587d2fcd8',
            '24e88e5e2ed1f3a42c7884da046ef6ed',
            'e958268cc71fad1faa4a84df0e4aff2b'
          )
        })
    })

    it('should have correct recent team info', () => {
      return request(app)
        .get('/reading-history/teams.json')
        .set('Accept', 'application/json')
        .expect(200)
        .then((res) => {
          const {recentlyViewed} = res.body
          const {team} = recentlyViewed.filter(({teamId}) => {
            return teamId === '6478ec336324a91b837acf752d7babc4'
          })[0]
          expect(team.id).equals('6478ec336324a91b837acf752d7babc4')
          expect(team.name).equals('Team Folder 2 | team')
          expect(team.prettyName).equals('Team Folder 2')
          expect(team.mimeType).equals('application/vnd.google-apps.folder')
          expect(team.tags).to.include('team')
          expect(team.slug).equals('team-folder-2')
        })
    })
  })
})
