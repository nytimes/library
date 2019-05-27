'use strict'

const log = require('../logger')
const {stringTemplate} = require('../utils')
const {inlineProtectedAsset} = require('../assetInliner')

// Base64-encode the branding images and inline the essential CSS, so that even
// when a user is not authenticated and thus can't request static assets, error
// pages will still look nice.
const assets = ['branding.icon', 'branding.favicon'].reduce((memo, key) => {
  memo[key] = inlineProtectedAsset(stringTemplate(key), { encoding: 'base64' })
  return memo
}, {})
assets.css = inlineProtectedAsset('/assets/css/inline.css')

// generic error handler to return error pages to user
module.exports = (err, req, res, next) => {
  const messages = {
    'Not found': 404,
    'Unauthorized': 403
  }

  const code = messages[err.message] || 500
  log.error(`Serving an error page for ${req.url}`, err)
  res.status(code).render(`errors/${code}`, {
    err,
    inlineAssets: assets,
    template: stringTemplate
  })
}
