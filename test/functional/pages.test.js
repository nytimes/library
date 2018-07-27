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
          // find a better way to check that this is actually home?
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
          done()
        })
    })

    it('GET /move-file?id=xxx', (done) => {
      request(app)
        .get('/move-file?id=xxxxxwsaMf60sZLTt5bhPKe2k5zmwEyMXjafR9Kxxxxx33Pqg')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err)
          expect(res.text).to.include('<h2>Choose a folder to move \'Article to move\' to</h2>')
          // check it has folder list and a folder to move it to
          expect(res.text).to.include('<ul class="folder-list">')
          expect(res.text).to.include('<a href="?id=xxxxxwsaMf60sZLTt5bhPKe2k5zmwEyMXjafR9Kxxxxx33Pqg&dest=xxxxxSgXzlz_9SGZpTVNab2xxxxxpSYVk">Article -0 70</a>')
          done()
        })
    })

    it('GET /categories', (done) => {
      request(app)
        .get('/categories')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err)
          expect(res.text).to.include('<h3>\n    <a href="/top-level-folder-2">\n    Top Level Folder 2\n    </a>\n    </h3>')
          done()
        })
    })

    // also tests insertion into datastore
    it('GET /top-level-folder-2 should have home', (done) => {
      request(app)
        .get('/top-level-folder-2')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err)
          expect(res.text).to.include('<h1 class="headline">Home article for top level folder 2</h1>')
          expect(res.text).to.include('By <span class="author">John Smith</span>')
          expect(res.text).to.include('Last edited by <span class="author">Foo Bar</span>')
          expect(res.text).to.include('Pages in Home article for top level folder 2')
          done()
        })
    })
  })
})
