'use strict'

const cacheManager = require('cache-manager')
const redisStore = require('cache-manager-ioredis')
const moment = require('moment')

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
      log.info(`CACHE PURGE PERSIST ${noCacheDelay}s: ${url}`)
      return cache.set(url, {noCache: true}, {ttl: noCacheDelay}, cb)
    }

    if (!force) {
      if (!data) return cb(new Error('Not found')) // if nothing is in cache, don't try to just purge
      if (redirectUrl || noCache) return cb(new Error('Unauthorized'))
    }

    // don't proceed with a normal purge of redirect or noCache without force param
    log.info(`CACHE PURGE ${url}`)
    cache.del(url, cb)
  })
}

function isNewer(oldModified, newModified) {
  const older = moment(oldModified)
  const newer = moment(newModified)

  return newer.diff(older) > 0
}

exports.add = (id, newModified, path, html) => {
  if (!newModified) return // refused to add anything without a modified timestamp

  cache.get(path, (err, data) => {
    if (err) return log.warn(`Failed adding data for ${path}`, err)

    const {modified, noCache} = data || {}
    if (noCache) return // refuse to cache any items that are being edited
    if (modified && !isNewer(modified, newModified)) return // nothing to do if data is current

    // console.log(`CACHE ADD ${path}`)
    cache.set(path, {html, modified: newModified, id})
  })
}

// redirects when a url changes
exports.redirect = (path, newPath) => {
  // take the existing data and extend it
  cache.get(path, (err, data) => {
    const {noCache} = data || {}

    log.info(`ADDING REDIRECT: ${path} => ${newPath}`)
    if (err) log.warn(`Failed retrieving data for redirect of ${path}`)
    cache.set(path, {redirectUrl: newPath}, (err) => {
      if (err) log.warn(`Failed setting redirect for ${path} => ${newPath}`, err)
    })

    const purgeCb = (err) => {
      if (err) log.warn(`Failed purging redirect destination ${newPath}`, err)
    }

    // either purge the destination or set it to a noCache
    // we need to update the destination to prevent redirect loops
    if (noCache) {
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
    if (!data) return // without data (or if we got an error) don't purge

    const {modified} = data
    const {home} = list.getChildren(id) || {}
    // don't proceed if the data is not newer or we are comparing a folder to its home contents
    if (!isNewer(modified, newModified) || home) return

    const segments = path.split('/').map((segment, i, segments) => {
      return segments.slice(0, i).concat([segment]).join('/')
    }).filter((s) => s.length) // don't allow purging empty string

    // purge each individual segment
    segments.forEach((url) => {
      log.info(`CACHE ANCESTOR PURGE ${url} FROM CHANGE AT ${path}`)
      purgeCache(url) // apply normal safeguards; don't delete redirects
    })
  })
}
