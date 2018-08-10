const request = require('supertest')
const sinon = require('sinon')
const {expect} = require('chai')

const app = require('../../server/index')
const {getTree, getDocsInfo} = require('../../server/list')

const userInfo = {
  emails: [{value: 'test.user@test.com'}],
  id: '10',
  userId: '10',
  _json: {domain: 'test.com'}
}

const playlistPath = '/top-level-article-2/article-ailbi/article-cabsa'

describe('Playlist route handling', () => {
  beforeEach(() => sinon.stub(app.request, 'session').value({passport: {user: userInfo}}))
  afterEach(() => sinon.restore())

  it('should query a playlist page', () => {
    return request(app)
            .get(`${playlistPath}/article-dnecn`)
            .expect(200)
            .then((res) => {
              console.log(res.text)
              expect(res.text).to.include('Article caBsa Playlist')
              expect(res.text).to.include('<li class="type-file">')
              expect(res.text).to.include('<a class="content-link" href="/top-level-article-2/article-ailbi/article-cabsa/article-etse"')
            })
  })

  it('should query a playlist', () => {
    return request(app)
            .get(`${playlistPath}`)
            .expect(200)
            .then((res) => {
              console.log(res.text)
              expect(res.text).to.include('Article caBsa Playlist')
              expect(res.text).to.include('<h1 class="visually-hidden">Default Playlist template</h1>')
            })
  })

  it('should return a 404 requesting nonexistent playlist page', () => {
    return request(app)
            .get(`${playlistPath}/fjfaklfjdalkf`)
            .expect(404)
            .then(res => {
              console.log(res.text)
              expect(res.text).include('404')
            })
  })
})
