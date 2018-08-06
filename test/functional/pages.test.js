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
        .get('/test-folder')
        .expect(200)
        .then((res) => {
          // check it resolves name correclty
          expect(res.text).to.include('Pages in Test Folder')
          // check it has links to children
          expect(res.text).to.include('Article 1 in test folder')
          expect(res.text).to.include('Article 2 in test folder')
        })
    })

    it('should remove trailing slash and redirect', () => {
      return request(app)
        // should strip trailing slash
        .get('/test-folder/')
        .expect(302) // Should be cached at this point
        .then((res) => {
          expect(res.text).to.equal('Found. Redirecting to /test-folder')
        })
    })

    it('should render folder list when moving a file', () => {
      return request(app)
        .get('/move-file?id=2bb299cfeab29b790cb3b11727586a77')
        .expect(200)
        .then((res) => {
          expect(res.text).to.include('<h2>Choose a folder to move \'Article to move\' to</h2>')
          // check it has folder list and a folder to move it to
          expect(res.text).to.include('<ul class="folder-list">')
          expect(res.text).to.include('<a href="?id=2bb299cfeab29b790cb3b11727586a77&dest=c351dc69415c5d3502c37f6b674b3c86">Article -0 70</a>')
        })
    })

    it('should render top level folder in categories', () => {
      return request(app)
        .get('/categories')
        .expect(200)
        .then((res) => {
          expect(res.text).to.include('<h3>\n    <a href="/top-level-folder-2">\n    Top Level Folder 2\n    </a>\n    </h3>')
        })
    })

    // also tests insertion into datastore
    it('folder with home doc should render the doc', () => {
      return request(app)
        .get('/top-level-folder-2')
        .expect(200)
        .then((res) => {
          expect(res.text).to.include('<h1 class="headline">Home article for top level folder 2</h1>')
          expect(res.text).to.include('By <span class="author">John Smith</span>')
          expect(res.text).to.include('Last edited by <span class="author">Foo Bar</span>')
          expect(res.text).to.include('Pages in Home article for top level folder 2')
        })
    })
  })
})
