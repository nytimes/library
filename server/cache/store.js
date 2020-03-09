'use strict'

const cacheManager = require('cache-manager')
const {promisify} = require('util')

const cache = cacheManager.caching({store: 'memory'})

// Export in-memory cache with promisified get and set methods
module.exports = {
  set: promisify(cache.set),
  get: promisify(cache.get)
}
