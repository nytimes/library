'use strict'

const cacheManager = require('cache-manager')
const redisStore = require('cache-manager-ioredis')
const log = require('../logger')
const {requireWithFallback} = require('../utils')

// Provides get, set methods for a cache
const store = requireWithFallback('cache/store')

module.exports = process.env.REDIS_URI ? cacheManager.caching({
  store: redisStore,
  host: process.env.REDIS_URI,
  password: process.env.REDIS_PASS,
  port: 6379,
  keyPrefix: 'nyt-library',
  db: 0,
  ttl: 0 // default ttl is infinite
}) : store

  // if we are using a redis instance, listen for errors
if (process.env.REDIS_URI) {
  const redisClient = exports.store.getClient()
  redisClient.on('error', (err) => log.error('ERROR FROM REDIS CLIENT:', err))
}
