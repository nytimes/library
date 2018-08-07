'use strict'

const async = require('async')
const moment = require('moment')
const {promisify} = require('util')

const log = require('./logger')
const {requireWithFallback} = require('./utils')

const cache = requireWithFallback('cache/store')

// delay caching for 1 hour by default after editing, with env var override
const noCacheDelay = parseInt(process.env.EDIT_CACHE_DELAY, 10) || 60 * 60

exports.get = promisify(cache.get) // expose the ability to retreive cache data internally
// detects purge requests and serves cached responses when available
exports.middleware = async (req, res, next) => {
  // handle the purge request if purge or edit params are present
  const {purge, edit, ignore} = req.query
  if (purge || edit) {
    const {email} = edit ? req.userInfo : {}
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
  const data = await exports.get(req.path)
  if (req.useBeta) {
    log.info('Skipping cache for beta API')
    return next()
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
}

exports.add = async (id, newModified, path, html) => {
  if (!newModified) return new Error('Refusing to store new item without modified time.')

  const data = await exports.get(path)
  const {modified, noCache, html: oldHtml} = data || {}
  // don't store any items over noCache entries
  if (noCache) return // refuse to cache any items that are being edited
  // if there was previous data and it is not older than the new data, don't do anything
  if (oldHtml && modified && !isNewer(modified, newModified)) return // nothing to do if data is current
  // store new data in the cache
  cache.set(path, {html, modified: newModified, id}, (err) => {
    if (err) log.warn(`Failed saving new cache data for ${path}`, err)
  })
}

// redirects when a url changes
// should we expose a cb here for testing?
exports.redirect = async (path, newPath, modified, cb = () => {}) => {
  const data = await exports.get(path)
  const {noCache, redirectUrl} = data || {}

  // since we run multiple pods, we don't need to set the redirect more than once
  if (redirectUrl === newPath) return cb(new Error('Already configured that redirect'))

  log.info(`ADDING REDIRECT: ${path} => ${newPath}`)
  // if (err) log.warn(`Failed retrieving data for redirect of ${path}`)

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
}

// expose the purgeCache method externally so that list can call while building tree
exports.purge = purgeCache

async function purgeCache({url, modified, editEmail, ignore}, cb = () => {}) {
  modified = modified || moment().subtract(1, 'hour').utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')

  const overrides = ignore && Array.isArray(ignore) ? new Set(ignore) : new Set().add(ignore)
  const shouldIgnore = (type) => overrides.has(type) || overrides.has('all') || overrides.has('1')

  if (!url) return cb(Error(`Can't purge cache without url! Given url was ${url}`))

  const data = await exports.get(url)
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
}

function isNewer(oldModified, newModified) {
  const older = moment(oldModified)
  const newer = moment(newModified)

  return newer.diff(older) > 0
}
