'use strict'

const request = require('supertest')
let app

describe.only('Authentication', () => {
  before(() => {
    process.env.GOOGLE_CLIENT_ID = '1234abcdefg'
    process.env.GOOGLE_CLIENT_SECRET = '1234abcdefg'
    app = require('../../server/index')
    app.use((req, res, next) => {
      req.user = {
        emails: {value: 'test-user@test.com'},
        userId: '10'
      }
      req.isAuthenticated = () => true
      next()
    })
  })


  it('GET /whoami.json should give correct info', (done) => {
    let data = {
      'email': '***REMOVED***',
      'userId': '10',
      'analyticsUserId': 'b803c0f4c737779239234926e8f07cca'
    }
    request(app).get('/whoami.json')
                .expect(200)
                .expect('Content-Type', /json/)
                .end((err, res) => {
                  if (err) return done(err)
                  console.log(JSON.stringify(res.body));
                  done()
                })
  })

  it('GET /foo/bar should 403', (done) => {
    request(app).get('/foo/bar')
                .expect(403)
                .expect('Content-Type', /json/)
                .end((err, res) => {
                  if (err) return done(err)
                  console.log(JSON.stringify(res));
                  done()
                })
  })
})
