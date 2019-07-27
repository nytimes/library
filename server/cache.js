'use strict'

const moment = require('moment')
const middlewareRouter = require('express-promise-router')()

const log = require('./logger')
const {requireWithFallback} = require('./utils')

const cache = requireWithFallback('cache/store')

// delay caching for 1 hour by default after editing, with env var override
const noCacheDelay = parseInt(process.env.EDIT_CACHE_DELAY, 10) || 60 * 60

exports.get = cache.get // expose the ability to retreive cache data internally

middlewareRouter.get('/filename-listing', async (req, res) => {
  const cached = await cache.get('ALL_FILENAMES')
  const lastModified = new Date(cached.modified).toISOString()
  res.header('Cache-Control', 'private, must-revalidate')
  res.header('Last-Modified', lastModified)
  return res.send(cached)
})

// detects purge requests and serves cached responses when available
middlewareRouter.use(async (req, res) => {
  // handle the purge request if purge or edit params are present
  const {purge, edit, ignore} = req.query
  if (purge || edit) {
    const {email} = edit ? req.userInfo : {}
    const overrides = ignore ? ignore.split(',') : null
    return purgeCache({
      url: req.path,
      editEmail: email,
      ignore: overrides
    }).then(() => res.end('OK')).catch((err) => {
      log.warn(`Cache purge failed for ${req.path}`, err)
      throw err
    })
  }

  // otherwise consult cache for stored html
  const data = await cache.get(req.path)

  const {html, redirectUrl, id} = data || {}
  if (redirectUrl) return res.redirect(redirectUrl)

  // if no html was returned proceed to next middleware
  if (!html) return 'next'

  // attach doc id to the request for reading history tracking
  res.locals.docId = id
  log.info(`CACHE HIT ${req.path}.`)
  res.end(html)
})

exports.middleware = middlewareRouter

exports.add = async (id, newModified, path, html) => {
  if (!newModified) throw new Error('Refusing to store new item without modified time.')

  const data = await cache.get(path)
  const {modified, noCache, html: oldHtml} = data || {}
  // don't store any items over noCache entries
  if (noCache) return // refuse to cache any items that are being edited
  // if there was previous data and it is not older than the new data, don't do anything
  if (oldHtml && modified && !isNewer(modified, newModified)) return // nothing to do if data is current
  // store new data in the cache
  return cache.set(path, {html, modified: newModified, id})
}

// redirects when a url changes
// should we expose a cb here for testing?
exports.redirect = async (path, newPath, modified) => {
  const data = await cache.get(path)
  const {noCache, redirectUrl} = data || {}

  // since we run multiple pods, we don't need to set the redirect more than once
  if (redirectUrl === newPath) throw new Error('Already configured that redirect')

  log.info(`ADDING REDIRECT: ${path} => ${newPath}`)

  await cache.set(path, {redirectUrl: newPath}).catch((err) => {
    if (err) log.warn(`Failed setting redirect for ${path} => ${newPath}`, err)
    return err
  })

  const preventCacheReason = noCache ? 'redirect_detected' : null
  return purgeCache({
    url: newPath,
    modified,
    editEmail: preventCacheReason,
    ignore: ['redirect', 'missing', 'modified']
  }).catch((err) => {
    if (err && err.message !== 'Not found') log.warn(`Failed purging redirect destination ${newPath}`, err)
    throw err
  })
}

// expose the purgeCache method externally so that list can call while building tree
exports.purge = purgeCache

async function purgeCache({url, modified, editEmail, ignore}) {
  modified = modified || moment().subtract(1, 'hour').utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')

  const overrides = ignore && Array.isArray(ignore) ? new Set(ignore) : new Set().add(ignore)
  const shouldIgnore = (type) => overrides.has(type) || overrides.has('all') || overrides.has('1')

  if (!url) throw new Error(`Can't purge cache without url! Given url was ${url}`)

  const data = await cache.get(url)
  // compare current cache entry data vs this request
  const {redirectUrl, noCache, html, modified: oldModified, purgeId: lastPurgeId} = data || {}

  if (redirectUrl && !shouldIgnore('redirect')) throw new Error('Unauthorized')
  // edit is considered its own override for everything but redirect

  // FIXME: this should be more robust
  if (editEmail && editEmail.includes('@')) {
    log.info(`CACHE PURGE PERSIST for ${noCacheDelay}s (${editEmail}): ${url}`)
    return cache.set(url, {noCache: true}, {ttl: noCacheDelay})
  }

  const purgeId = `${modified}-${editEmail || ''}-${ignore}`

  // if attempting to purge /trash but nothing has changed, skip.
  if (purgeId === lastPurgeId && url === '/trash') return

  // const isTrashed = url.split('/')[1] === 'trash'
  // try and dedupe extra requests from multiple pods (tidier logs)
  if (purgeId === lastPurgeId && !shouldIgnore('all')) throw new Error(`Same purge id as previous request ${purgeId} for ${url}`)
  // by default, don't try to purge empty
  if (!html && !shouldIgnore('missing')) throw new Error('Not found')
  // by default, don't purge a noCache entry
  if (noCache && !shouldIgnore('editing')) throw new Error('Unauthorized')
  // by default, don't purge when the modification time is not fresher than previous
  if (!isNewer(oldModified, modified) && !shouldIgnore('modified')) throw new Error(`No purge of fresh content for ${url}`)

  // if we passed all the checks, determine all ancestor links and purge
  const segments = url.split('/').map((segment, i, segments) => {
    return segments.slice(0, i).concat([segment]).join('/')
  }).filter((s) => s.length) // don't allow purging empty string

  // call the callback when all segments have been purged
  return Promise.all(
    segments.map((path) => {
      log.info(`CACHE PURGE ${path} FROM CHANGE AT ${url}`)
      // there is an edge here where a homepage upstream was being edited and already not in cache.
      // we need to get the cache entries for all of these in case and not purge them to account for that edge
      cache.set(path, {modified, purgeId})
    })
  )
}

function isNewer(oldModified, newModified) {
  const older = moment(oldModified)
  const newer = moment(newModified)

  return newer.diff(older) > 0
}
