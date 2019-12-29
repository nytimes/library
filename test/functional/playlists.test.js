const request = require('supertest')
const sinon = require('sinon')
const {expect} = require('chai')

const app = require('../../server/index')

const userInfo = {
  emails: [{value: 'test.user@test.com'}],
  id: '10',
  userId: '10',
  _json: {domain: 'test.com'}
}

const playlistPath = '/test-folder-9/test-14'

describe('Playlist route handling', () => {
  beforeEach(() => sinon.stub(app.request, 'session').value({passport: {user: userInfo}}))
  afterEach(() => sinon.restore())

  it('should query a playlist page', () => {
    return request(app)
            .get(`${playlistPath}/test-3`)
            .expect(200)
            .then((res) => {
              expect(res.text).to.include('Test 14 Playlist')
              expect(res.text).to.include('<li class="type-file">')
              expect(res.text).to.include(`<a class="content-link" href="${playlistPath}/article-1-in-test-folder-1"`)
            })
  })

  it('should query a playlist', () => {
    return request(app)
            .get(`${playlistPath}`)
            .expect(200)
            .then((res) => {
              expect(res.text).to.include('Article 1 in test folder 1')
              expect(res.text).to.include('<h1 class="visually-hidden">Default Playlist template</h1>')
              expect(res.text).to.include(`<a class="content-link" href="${playlistPath}/article-1-in-test-folder-1"`)
            })
  })

  it('should return a 404 requesting nonexistent playlist page', () => {
    return request(app)
            .get(`${playlistPath}/fjfaklfjdalkf`)
            .expect(404)
            .then((res) => expect(res.text).include('404'))
  })
})
