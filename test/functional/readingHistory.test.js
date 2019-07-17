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
  beforeEach(() => sinon.stub(app.request, 'session').value({passport: {user: userInfo}}))
  afterEach(() => sinon.restore())

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
            'Test2',
            'Test3',
            'Test4',
            'Test5'
          )
          expect(mostIds).to.include(
            'Test2',
            'Test3',
            'Test4'
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
            return documentId === 'Test5'
          })[0]
          expect(doc.id).equals('Test5')
          expect(doc.name).equals('Article 2 in test folder 1 | tagtest')
          expect(doc.prettyName).equals('Article 2 in test folder 1')
          expect(doc.mimeType).equals('application/vnd.google-apps.document')
          expect(doc.tags).to.include('tagtest')
          expect(doc.slug).equals('article-2-in-test-folder-1')
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
            return documentId === 'Test4'
          })[0]
          expect(doc.id).equals('Test4')
          expect(doc.name).equals('Article 1 in test folder 1')
          expect(doc.prettyName).equals('Article 1 in test folder 1')
          expect(doc.mimeType).equals('application/vnd.google-apps.document')
          expect(doc.tags).to.be.empty // eslint-disable-line no-unused-expressions
          expect(doc.slug).equals('article-1-in-test-folder-1')
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
            'TestFolder9',
            'TestFolder17'
          )
          expect(mostIds).to.include(
            'TestFolder9',
            'TestFolder17'
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
            return teamId === 'TestFolder9'
          })[0]
          expect(team.id).equals('TestFolder9')
          expect(team.name).equals('Test Folder 9 | team')
          expect(team.prettyName).equals('Test Folder 9')
          expect(team.mimeType).equals('application/vnd.google-apps.folder')
          expect(team.tags).to.include('team')
          expect(team.slug).equals('test-folder-9')
        })
    })
  })
})
