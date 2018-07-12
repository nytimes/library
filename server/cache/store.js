const cacheManager = require('cache-manager')

// Default in-memory cache
module.exports = cacheManager.caching({ store: 'memory' })
