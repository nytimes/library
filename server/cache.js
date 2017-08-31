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

// detects purge requests and serves cached responses when available
exports.middleware = (req, res, next) => {
  // if purge or edit params are passed, we should purge cache for this url
  const {purge, edit, force} = req.query
  if (purge || edit) {
    const {email} = edit ? getUserInfo(req) : {}
    // pass modified time of 1 hour ago to not conflict with change
    return purgeCache(req.path, null, email, force, (err) => {
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
    const {html, redirectUrl, id} = data || {}
    if (redirectUrl) {
      return res.redirect(redirectUrl)
    }

    if (!html) return next()
    // store the retrieved doc id (for reading history)
    res.locals.docId = id

    log.info(`CACHE HIT ${req.path}.`)
    res.end(html)
  })
}

exports.add = (id, newModified, path, html) => {
  // console.log('ADD', p)
  if (!newModified) return // refused to add anything without a modified timestamp

  cache.get(path, (err, data) => {
    if (err) return log.warn(`Failed saving cache data for ${path}`, err)

    const {modified, noCache, html: oldHtml} = data || {}
    // don't store any items over noCache entries
    if (noCache) return // refuse to cache any items that are being edited
    // if there was previous data and it is not older than the new data, don't do anything
    if (oldHtml && modified && !isNewer(modified, newModified)) return // nothing to do if data is current
    // store new data in the cache
    cache.set(path, {html, modified: newModified, id}, (err) => {
      if (err) log.warn(`Failed saving new cache data for ${path}`, err)
    })
  })
}

// redirects when a url changes
exports.redirect = (path, newPath) => {
  cache.get(path, (err, data) => {
    const {noCache, redirectUrl} = data || {}

    // since we run multiple pods, we don't need to set the redirect more than once
    if (redirectUrl === newPath) return

    log.info(`ADDING REDIRECT: ${path} => ${newPath}`)
    if (err) log.warn(`Failed retrieving data for redirect of ${path}`)

    // store redirect url at current location
    cache.set(path, {redirectUrl: newPath}, (err) => {
      if (err) log.warn(`Failed setting redirect for ${path} => ${newPath}`, err)
    })

    const preventCacheReason = noCache ? 'redirect_detected' : null
    // purge the cache on the destination to eliminate old redirects
    // we should ignore redirects at the new location
    purgeCache(newPath, null, preventCacheReason, 'all', (err) => { // @TODO change to redirect logic when working
      if (err && err.message !== 'Not found') log.warn(`Failed purging redirect destination ${newPath}`, err)
    }) // force purge the cache
  })
}

// passthrough method for purging by ID
// maybe we should not support purging by id, just by path
exports.purge = purgeCache
// we should enable this to traverse ancestors always
function purgeCache(url, modified, editEmail, ignore, cb) {
  modified = modified || moment().subtract(1, 'hour').utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
  const shouldIgnore = (type) => ignore === type || ignore === 'all' || ignore === true
  const debug = (...args) => {
    // if (url.indexOf('test-document') > -1) console.log.apply(console, args)
  }

  const opts = {url, modified, editEmail, ignore}
  if (!cb) {
    cb = (err) => { debug(`${url}:${((err || {}).message || 'purged')}`) }
  }

  debug('purging', opts)
  // get the current cache entry
  cache.get(url, (err, data) => {
    if (err) log.warn(`Received error while trying to retrieve existing cache for purge of ${url}`, err)
    const {redirectUrl, noCache, html, modified: oldModified} = data || {}

    if (redirectUrl && !shouldIgnore('redirect')) return cb(new Error('Unauthorized'))
    // edit is considered its own override for everything but redirect
    if (editEmail) {
      log.info(`CACHE PURGE PERSIST for ${noCacheDelay}s (${editEmail}): ${url}`)
      return cache.set(url, {noCache: true}, {ttl: noCacheDelay}, cb)
    }

    // the rest of the necessary overrides are specific by their reason
    // by default, don't try to purge empty
    if (!html && !shouldIgnore('missing')) return cb(new Error('Not found'))
    // by default, don't purge a noCache entry
    if (noCache && !shouldIgnore('editing')) return cb(new Error('Unauthorized'))
    // by default, don't purge when the modification time is not fresher than
    if (!isNewer(oldModified, modified) && !shouldIgnore('modified')) return cb(new Error('No purge of fresh content'))

    // if we passed all the checks, determine all ancestor links and purge
    const segments = url.split('/').map((segment, i, segments) => {
      return segments.slice(0, i).concat([segment]).join('/')
    }).filter((s) => s.length) // don't allow purging empty string

    debug('proceeding to purge', Object.assign({}, {segments}, opts))
    // call the callback when all segments have been purged
    async.parallel(segments.map((path) => {
      return (cb) => {
        log.info(`CACHE PURGE ${path} FROM CHANGE AT ${url}`)
        cache.set(path, {modified, purged: true}, cb) // store the modification time to allow for deduping deletes
      }
    }), cb)
  })
}

function isNewer(oldModified, newModified) {
  const older = moment(oldModified)
  const newer = moment(newModified)

  return newer.diff(older) > 0
}
