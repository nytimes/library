'use strict'

const router = require('express-promise-router')()

const cache = require('../cache')

router.get('*', handleRedirects)
module.exports = router

async function handleRedirects(req, res) {
  const pathCache = await cache.get(req.path)
  if (!pathCache) throw new Error('Not found')

  const {content} = pathCache
  if (content.redirect) return res.redirect(content.redirect)
  throw new Error('Not found')
}
