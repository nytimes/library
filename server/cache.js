'use strict'

const moment = require('moment')
const middlewareRouter = require('express-promise-router')()

const log = require('./logger')
const {requireWithFallback} = require('./utils')
const {parseUrl} = require('./urlParser')

const cache = requireWithFallback('cache/store')

// delay caching for 1 hour by default after editing, with env var override
const noCacheDelay = parseInt(process.env.EDIT_CACHE_DELAY, 10) || 60 * 60

exports.get = cache.get // expose the ability to retreive cache data internally

// detects purge requests in the query string
middlewareRouter.use(async (req, res) => {
  // handle the purge request if purge or edit params are present
  const {purge, edit, ignore} = req.query

  if (purge || edit) {
    const {email} = edit ? req.userInfo : {}
    const overrides = ignore ? ignore.split(',') : null
    const {meta} = await parseUrl(req.path)

    return purgeCache({
      id: meta.id,
      editEmail: email,
      ignore: overrides
    }).then(() => res.end('OK')).catch((err) => {
      log.warn(`Cache purge failed for ${req.path}`, err)
      throw err
    })
  }

  return 'next'
})

exports.middleware = middlewareRouter

exports.add = async (id, newModified, content) => {
  if (!newModified) throw new Error('Refusing to store new item without modified time.')

  const data = await cache.get(id)
  const {modified, noCache, content: oldContent} = data || {}
  // don't store any items over noCache entries
  if (noCache) return // refuse to cache any items that are being edited
  // if there was previous data and it is not older than the new data, don't do anything
  if (oldContent && modified && !isNewer(modified, newModified)) return // nothing to do if data is current
  // store new data in the cache
  return cache.set(id, {content, modified: newModified, id})
}

// expose the purgeCache method externally so that list can call while building tree
exports.purge = purgeCache

async function purgeCache({id, modified, editEmail, ignore}) {
  modified = modified || moment().subtract(1, 'hour').utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')

  const overrides = ignore && Array.isArray(ignore) ? new Set(ignore) : new Set().add(ignore)
  const shouldIgnore = (type) => overrides.has(type) || overrides.has('all') || overrides.has('1')

  if (!id) throw new Error(`Can't purge cache without a document id! Given id was ${id}`)

  const data = await cache.get(id)

  if (!data) return // if no currently cached item, don't attempt to purge

  // compare current cache entry data vs this request
  const {noCache, content, purgeId: lastPurgeId} = data || {}
  const html = content && content.html

  // FIXME: this should be more robust
  if (editEmail && editEmail.includes('@')) {
    log.info(`CACHE PURGE PERSIST for ${noCacheDelay}s (${editEmail}): ${id}`)
    return cache.set(id, {noCache: true}, {ttl: noCacheDelay})
  }

  const purgeId = `${modified}-${editEmail || ''}-${ignore}`

  // try and dedupe extra requests from multiple pods (tidier logs)
  if (purgeId === lastPurgeId && !shouldIgnore('all')) throw new Error(`Same purge id as previous request ${purgeId} for docId ${id}`)

  // by default, don't try to purge empty
  if (!html && !shouldIgnore('missing')) throw new Error('Not found')

  // by default, don't purge a noCache entry
  if (noCache && !shouldIgnore('editing')) throw new Error('Unauthorized')

  // if all checks pass, purge
  log.info(`CACHE PURGE ${id}`)
  cache.set(id, {modified, purgeId})
}

function isNewer(oldModified, newModified) {
  const older = moment(oldModified)
  const newer = moment(newModified)

  return newer.diff(older) > 0
}
