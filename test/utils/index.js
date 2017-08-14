'use strict'

// a helper to allow arrow functions with mocha
exports.f = (cb) => {
  return function () {
    return cb(this) // eslint-disable-line standard/no-callback-literal
  }
}
