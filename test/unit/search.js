const {expect} = require('chai')
const {google} = require('googleapis')

const {run} = require('../../server/search')
const auth = require('../../server/auth')


describe('Seach module', () => {
  describe('when not authenticated', () => {
    let oldAuth, oldGetApplicationDefault;
    before(() => {
      oldGetApplicationDefault = google.auth.getApplicationDefault
      google.auth.getApplicationDefault = function (cb) {
        cb(Error('Error'))
      }
      oldAuth = auth.getAuth

      auth.getAuth = function(cb) {
        google.auth.getApplicationDefault(cb)
      }
    })

    it.only('should return an error if not authenticated', (next) => {
      run('lib', (err) => {
        console.log('\ngot error\n', err)
        expect(err).to.not.be(null)
        next()
      })
    })

    after(() => {
      google.auth.getApplicationDefault = oldGetApplicationDefault
    })
    

  })
})

