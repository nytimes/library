'use strict'

const async = require('async')
const cacheManager = require('cache-manager')
const redisStore = require('cache-manager-ioredis')
const moment = require('moment')

const log = require('./logger')
const {getUserInfo} = require('./utils')

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
  redisClient.on('error', (err) => log.error('ERROR FROM REDIS CLIENT:', err))
}

// delay caching for 1 hour by default after editing, with env var override
const noCacheDelay = parseInt(process.env.EDIT_CACHE_DELAY, 10) || 60 * 60

exports.get = cache.get // expose the ability to retreive cache data internally
// detects purge requests and serves cached responses when available
exports.middleware = (req, res, next) => {
  // handle the purge request if purge or edit params are present
  const {purge, edit, ignore} = req.query
  if (purge || edit) {
    const {email} = edit ? getUserInfo(req) : {}
    const overrides = ignore ? ignore.split(',') : null
    return purgeCache({
      url: req.path,
      editEmail: email,
      ignore: overrides
    }, (err) => {
      if (err) {
        log.warn(`Cache purge failed for ${req.path}`, err)
        return next(err)
      }

      res.end('OK')
    })
  }

  // otherwise consult cache for stored html
  cache.get(req.path, (err, data) => {
    if (err) {
      log.warn(`Failed retrieving cache for ${req.path}`, err)
      return next() // silently proceed in the stack
    }

    const {html, redirectUrl, id} = data || {}
    if (redirectUrl) {
      return res.redirect(redirectUrl)
    }

    // if no html was returned proceed to next middleware
    if (!html) return next()

    // attach doc id to the request for reading history tracking
    res.locals.docId = id

    log.info(`CACHE HIT ${req.path}.`)
    res.end(html)
  })
}

exports.add = (id, newModified, path, html, cb = () => {}) => {
  if (!newModified) return cb(new Error('Refusing to store new item without modified time.'))

  cache.get(path, (err, data) => {
    if (err) {
      log.warn(`Failed saving cache data for ${path}`, err)
      return cb(err)
    }

    const {modified, noCache, html: oldHtml} = data || {}
    // don't store any items over noCache entries
    if (noCache) return cb()// refuse to cache any items that are being edited
    // if there was previous data and it is not older than the new data, don't do anything
    if (oldHtml && modified && !isNewer(modified, newModified)) return cb()// nothing to do if data is current
    // store new data in the cache
    cache.set(path, {html, modified: newModified, id}, (err) => {
      if (err) log.warn(`Failed saving new cache data for ${path}`, err)
      cb(err)
    })
  })
}

// redirects when a url changes
// should we expose a cb here for testing?
exports.redirect = (path, newPath, modified, cb = () => {}) => {
  cache.get(path, (err, data) => {
    const {noCache, redirectUrl} = data || {}

    // since we run multiple pods, we don't need to set the redirect more than once
    if (redirectUrl === newPath) return cb(new Error('Already configured that redirect'))

    log.info(`ADDING REDIRECT: ${path} => ${newPath}`)
    if (err) log.warn(`Failed retrieving data for redirect of ${path}`)

    const preventCacheReason = noCache ? 'redirect_detected' : null
    async.parallel([
      (cb) => {
        // store redirect url at current location
        cache.set(path, {redirectUrl: newPath}, (err) => {
          if (err) log.warn(`Failed setting redirect for ${path} => ${newPath}`, err)
          cb(err)
        })
      },
      (cb) => {
        // purge the cache on the destination to eliminate old redirects
        // we should ignore redirects at the new location
        // @TODO: why do we need to pass 'modified' as an ignore param here?
        purgeCache({
          url: newPath,
          modified,
          editEmail: preventCacheReason,
          ignore: ['redirect', 'missing', 'modified']
        }, (err) => {
          if (err && err.message !== 'Not found') log.warn(`Failed purging redirect destination ${newPath}`, err)
          cb(err)
        })
      }
    ], cb)
  })
}

// expose the purgeCache method externally so that list can call while building tree
exports.purge = purgeCache

function purgeCache({url, modified, editEmail, ignore}, cb = () => {}) {
  modified = modified || moment().subtract(1, 'hour').utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')

  const overrides = ignore && Array.isArray(ignore) ? new Set(ignore) : new Set().add(ignore)
  const shouldIgnore = (type) => overrides.has(type) || overrides.has('all') || overrides.has('1')

  cache.get(url, (err, data) => {
    if (err) log.warn(`Received error while trying to retrieve existing cache for purge of ${url}`, err)
    // compare current cache entry data vs this request
    const {redirectUrl, noCache, html, modified: oldModified, purgeId: lastPurgeId} = data || {}

    if (redirectUrl && !shouldIgnore('redirect')) return cb(new Error('Unauthorized'))
    // edit is considered its own override for everything but redirect
    if (editEmail && editEmail.includes('@')) { // @TODO cleanup this hack
      log.info(`CACHE PURGE PERSIST for ${noCacheDelay}s (${editEmail}): ${url}`)
      return cache.set(url, {noCache: true}, {ttl: noCacheDelay}, cb)
    }

    // try and dedupe extra requests from multiple pods (tidier logs)
    const purgeId = `${modified}-${editEmail || ''}-${ignore}`
    if (purgeId === lastPurgeId && !shouldIgnore('all')) return cb(new Error(`Same purge id as previous request ${purgeId}`))
    // by default, don't try to purge empty
    if (!html && !shouldIgnore('missing')) return cb(new Error('Not found'))
    // by default, don't purge a noCache entry
    if (noCache && !shouldIgnore('editing')) return cb(new Error('Unauthorized'))
    // by default, don't purge when the modification time is not fresher than previous
    if (!isNewer(oldModified, modified) && !shouldIgnore('modified')) return cb(new Error('No purge of fresh content'))

    // if we passed all the checks, determine all ancestor links and purge
    const segments = url.split('/').map((segment, i, segments) => {
      return segments.slice(0, i).concat([segment]).join('/')
    }).filter((s) => s.length) // don't allow purging empty string

    // call the callback when all segments have been purged
    async.parallel(segments.map((path) => {
      return (cb) => {
        log.info(`CACHE PURGE ${path} FROM CHANGE AT ${url}`)
        // there is an edge here where a homepage upstream was being edited and already not in cache.
        // we need to get the cache entries for all of these in case and not purge them to account for that edge
        cache.set(path, {modified, purgeId}, cb)
      }
    }), cb)
  })
}

function isNewer(oldModified, newModified) {
  const older = moment(oldModified)
  const newer = moment(newModified)

  return newer.diff(older) > 0
}
