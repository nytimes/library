'use strict'

const cacheManager = require('cache-manager')
const {promisify} = require('util')

const cache = cacheManager.caching({ store: 'memory' })

cache.set = promisify(cache.set)
cache.get = promisify(cache.get)

// Export in-memory cache with promisified get and set methods
module.exports = cache
