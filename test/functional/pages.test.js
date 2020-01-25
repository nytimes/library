'use strict'

const request = require('supertest')
const {expect} = require('chai')
const sinon = require('sinon')
const {allFilenames} = require('../utils')

const app = require('../../server/index')

const userInfo = {
  emails: [{value: 'test.user@test.com'}],
  id: '10',
  userId: '10',
  _json: {domain: 'test.com'}
}

describe('Server responses', () => {
  beforeEach(() => sinon.stub(app.request, 'session').value({passport: {user: userInfo}}))
  afterEach(() => sinon.restore())

  describe('that return HTML', () => {
    it('should return 200 and content for homepage', () => {
      return request(app)
        .get('/')
        .expect(200)
        .then((res) => expect(res.text).to.include('<title>Team Library</title>'))
    })

    it('should return 200 OK for healthcheck', () => {
      return request(app)
        .get('/healthcheck')
        .expect(200)
        .then((res) => {
          expect(res.text).to.equal('OK')
        })
    })

    it('should display subfolders for folder', () => {
      return request(app)
        .get('/test-folder-1')
        .expect(200)
        .then((res) => {
          // check it resolves name correclty
          expect(res.text).to.include('Pages in Test Folder 1')
          // check it has links to children
          expect(res.text).to.include('Article 1 in test folder 1')
          expect(res.text).to.include('Article 2 in test folder 1')
        })
    })

    it('should remove trailing slash and redirect', () => {
      return request(app)
        // should strip trailing slash
        .get('/test-folder-1/')
        .expect(302) // Should be cached at this point
        .then((res) => {
          expect(res.text).to.equal('Found. Redirecting to /test-folder-1')
        })
    })

    it('should render top level folder in categories', () => {
      return request(app)
        .get('/categories')
        .expect(200)
        .then((res) => {
          expect(res.text).to.include('<h3>\n    <a href="/test-folder-1">\n    Test Folder 1\n    </a>\n    </h3>')
        })
    })

    // also tests insertion into datastore
    it('folder with home doc should render the doc', () => {
      return request(app)
        .get('/test-folder-9')
        .expect(200)
        .then((res) => {
          expect(res.text).to.include('<h1 class="headline">Home article 10 for test folder 9</h1>')
          expect(res.text).to.include('By <span class="author">John Smith</span>')
          expect(res.text).to.include('Last edited by <span class="author">Foo Bar</span>')
          expect(res.text).to.include('Home article 10 for test folder 9')
        })
    })

    it('duplicate doc should render a warning', () => {
      return request(app)
        .get('/test-folder-9/article-3-in-test-folder-9')
        .expect(200)
        .then((res) => {
          expect(res.text).to.include('<h1 class="headline">Article 3 in test folder 9</h1>')
          expect(res.text).to.include('By <span class="author">John Smith</span>')
          expect(res.text).to.include('Last edited by <span class="author">Foo Bar</span>')
          expect(res.text).to.include('Article 3 in test folder 9')
          expect(res.text).to.include(
            '<div class="warning">\n  Warning: Multiple resources in ' +
            '<a href="https://drive.google.com/drive/u/0/folders/TestFolder9" target="_blank">' +
            'this folder</a> share the same name&#58; Article 3 in test folder 9. Only one will be ' +
            'accesible through Library.\n</div>'
          )
        })
    })

    it('should render an inline <style> tag and no JS on error pages', () => {
      return request(app)
        .get('/this-route-does-not-exist')
        .expect(404)
        .then((res) => {
          expect(res.text).to.match(/<style type="text\/css">[^<]/i)
          expect(res.text).to.not.include('<link href="/assets')
          expect(res.text).to.not.include('<script src="/assets')
        })
    })
  })

  describe('that return JSON', () => {
    it('should contain a complete filename listing', () => {
      return request(app)
      .get('/filename-listing.json')
        .expect(200)
        .then((res) => {
          const {filenames} = res.body
          expect(Array.isArray(filenames), 'cached file listing should be an array')
          expect(filenames).to.include(...allFilenames)
          expect(filenames.length).to.equal(allFilenames.length)
        })
    })
  })
})
