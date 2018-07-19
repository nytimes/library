const passport = require('passport')
const util = require('util')

function MockStrategy(options, verify) {
  this.name = 'mock'
  this.passAuthentication = options.passAuthentication || true
  this.userId = options.userId || 1
  this.verify = verify
}

util.inherits(MockStrategy, passport.Strategy)

MockStrategy.prototype.authenticate = function authenticate(req) {
  console.log('Mocking Authentication!')
  if (this.passAuthentication) {
    const user = {
      id: this.userId
    }
    const self = this
    this.verify(user, (err, resident) => {
      if (err) {
        self.fail(err)
      } else {
        self.success(resident)
      }
    })
  } else {
    this.fail('Unauthorized')
  }
}

MockStrategy.prototype.userProfile = () => {
  return {
    id: '10',
    emails: [{defaultEmail: 'test@test.com'}]
  }
}

module.exports = MockStrategy
