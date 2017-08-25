'use strict'

const cacheManager = require('cache-manager')
const redisStore = require('cache-manager-ioredis')

const log = require('./logger')
const list = require('./list') // we must use top level because of circular ref

const cache = process.env.REDIS_URI
  ? cacheManager.caching({
    store: redisStore,
    host: process.env.REDIS_URI,
    password: process.env.REDIS_PASS,
    port: 6379,
    keyPrefix: 'nyt-library',
    db: 0,
    ttl: 0 // default ttl is infinite
  })
  : cacheManager.caching({
    store: 'memory'
  })

// if we are using a redis instance, listen for errors
if (process.env.REDIS_URI) {
  const redisClient = cache.store.getClient()
  redisClient.on('error', (err) => log.err(err))
}

// delay caching for 1 hour by default after editing, with env var override
const noCacheDelay = parseInt(process.env.EDIT_CACHE_DELAY, 10) || 60 * 60
// // detects purge requests and serves cached responses when available
exports.middleware = (req, res, next) => {
  // if purge or edit params are passed, we should purge cache for this url
  const {purge, edit, force} = req.query
  if (purge || edit) {
    return purgeCache(req.path, edit, force, (err) => {
      if (err) {
        log.warn(`Cache purge failed for ${req.path}`, err)
        return next(err)
      }

      log.info(`Cache purge complete for ${req.path}.`)
      res.end('OK')
    })
  }

  // retrieve the cached data
  cache.get(req.path, (err, data) => {
    if (err) {
      log.warn(`Failed retrieving cache for ${req.path}`, err)
      return next() // silently proceed in the stack
    }

    // might get redirect info back or html
    const {html, redirectUrl} = data || {}
    if (redirectUrl) {
      return res.redirect(redirectUrl)
    }

    if (!html) return next()

    log.info(`CACHE HIT ${req.path}.`)
    res.end(html)
  })
}

function purgeCache(url, edit, force, cb = () => {}) {
  cache.get(url, (err, data) => {
    if (err) log.warn(`Received error while trying to purge cache on demand for ${url}`, err)
    const {redirectUrl, noCache} = data || {}

    if (edit) {
      if (redirectUrl && !force) return cb(new Error('Unauthorized'))
      return cache.set(url, {noCache: true}, {ttl: noCacheDelay}, cb)
    }

    if (!force) {
      if (!data) return cb(new Error('Not found')) // if nothing is in cache, don't try to just purge
      if (redirectUrl || noCache) return cb(new Error('Unauthorized'))
    }

    // don't proceed with a normal purge of redirect or noCache without force param
    log.debug(`CACHE PURGE ${url}`)
    cache.del(url, cb)
  })
}

exports.add = (id, newModified, path, html) => {
  if (!newModified) return // refused to add anything without a modified timestamp

  cache.get(path, (err, data) => {
    if (err) return log.warn(`Failed adding data for ${path}`, err)

    const {modified, noCache} = data || {}
    if (noCache) return // refuse to cache any items that are being edited
    if (modified === newModified) return // nothing to do if data is current

    console.log(`CACHE ADD ${path}`)
    cache.set(path, {html, modified: newModified, id})
  })
}

// redirects when a url changes
exports.redirect = (path, newPath) => {
  // take the existing data and extend it
  cache.get(path, (err, data) => {
    const {noCache} = data || {}

    if (err) console.warn(`Failed retrieving data for redirect of ${path}`)
    console.log(`redirecting ${path} => ${newPath}`)
    cache.set(path, {redirectUrl: newPath}, (err) => {
      console.log(`CACHE REDIRECT FROM ${path}`)
      if (err) log.warn(`Failed setting redirect for ${path} => ${newPath}`, err)
    })

    const purgeCb = (err) => {
      if (err) log.warn(`Failed purging redirect destination ${newPath}`, err)
    }

    // either purge the destination or set it to a noCache
    // we need to update the destination to prevent redirect loops
    if (noCache) {
      console.log('passing along nocache')
      cache.set(newPath, {noCache}, {ttl: noCacheDelay}, purgeCb)
    } else {
      purgeCache(newPath, null, true, purgeCb) // force purge the cache
    }
  })
}

// purge assets by id and their modified times
exports.purge = (id, newModified) => {
  const meta = list.getMeta(id)
  const {path} = meta || {}
  // we need a path in order to purge
  if (!path) return

  cache.get(path, (err, data) => {
    if (err) log.warn(`Can't purge data for ${data.path} because failed reading previous cache`, err)
    if (!data) return // nothing to do if no data is in the database

    const {modified} = data
    if (modified === newModified) return // nothing to do if modified has not changed

    const segments = path.split('/').map((segment, i, segments) => {
      return segments.slice(0, i).concat([segment]).join('/')
    })

    // purge each individual segment
    segments.forEach((url) => {
      purgeCache(url) // apply normal safeguards; don't delete redirects
    })
  })
}
