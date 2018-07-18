'use strict'

const request = require('supertest')
// const {google} = require('googleapis')
const {assert} = require('chai')
const {f} = require('../utils')
let app

const driveFixture = require('../fixtures/driveListing')



describe('Authentication', () => {
  before('this', function() {
    this.timeout(5000)
    process.env.GOOGLE_CLIENT_ID = 'abc123'
    process.env.GOOGLE_CLIENT_SECRET = 'abc123'
    process.env.SESSION_SECRET = 'abc123'
    process.env.APPROVED_DOMAINS = 'test.com'
    app = require('../../server/index')
    // THIS MUST GO IN BEGINNING?!
    // app.use((req, res, next) => {
    //   req.user = {
    //     emails: {value: 'test-user@test.com'},
    //     userId: '10'
    //   }
    //   req.userInfo = {
    //     email: 'test-user@test.com',
    //     userId: '10',
    //     analyticsUserId: 'asdfjkl123library'
    //   }
    //   req.isAuthenticated = () => true
    //   next()
    // })
    // google.drive = () => {
    //   return { files: {
    //     list: () => driveFixture
    //   }}
    // }
  })

  // let data = {
  //   'email': '***REMOVED***',
  //   'userId': '10',
  //   'analyticsUserId': 'b803c0f4c737779239234926e8f07cca'
  // }

  it('GET / should redirect to login if unauthenticated', (done) => {
    request(app).get('/')
                .expect(302) // expect user to be found
                .end((err, res) => {
                  if (err) return done(err)
                  assert.equal(res.text, 'Found. Redirecting to /login')
                  done()
                })
  })

  it('GET a path should redirect to login if unauthenticated', (done) => {
    request(app).get('/foo/bar')
                .expect(302)
                .end((err, res) => {
                  if (err) return done(err)
                  assert.equal(res.text, 'Found. Redirecting to /login')
                  done()
                })
  })
})
