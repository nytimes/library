'use strict'

const fs = require('fs')
const log = require('../logger')
const {stringTemplate, assetDataURI} = require('../utils')

let assetCache

// Because asset requests are authenticated, we inline the images and CSS
// that we need to serve to logged-out users, e.g. on the auth error page.
function loadInlineAssets() {
  if (assetCache) return new Promise((resolve) => resolve(assetCache))

  const assets = {}
  const assetPromises = ['branding.icon', 'branding.favicon'].map((key) => {
    // Load essential images as base64 data-URIs
    return new Promise((resolve, reject) => {
      assetDataURI(stringTemplate(key)).then((img) => {
        assets[key] = img
        resolve()
      }).catch((err) => {
        // It's okay for users to have deleted these keys,
        // but other errors should throw
        if (err.code === 'ENOENT') { resolve(err) } else { throw err }
      })
    })
  }).concat(
    // Load the core stylesheet
    new Promise((resolve, reject) => {
      fs.readFile('public/errors.css', (err, data) => {
        if (err) throw err
        assets.css = data.toString()
        resolve()
      })
    })
  )

  return new Promise((resolve, reject) => {
    Promise.all(assetPromises).then(() => {
      assets.stringTemplate = (key, ...args) => {
        return assets[key] || stringTemplate(key, ...args)
      }
      // Store the inlined assets in memory for subsequent requests
      assetCache = assets

      resolve(assetCache)
    })
  })
}

// generic error handler to return error pages to user
module.exports = (err, req, res, next) => {
  const messages = {
    'Not found': 404,
    'Unauthorized': 403
  }

  const code = messages[err.message] || 500
  log.error(`Serving an error page for ${req.url}`, err)
  return loadInlineAssets().then((inline) => {
    res.status(code).render(`errors/${code}`, {
      inlineCSS: inline.css,
      err,
      template: inline.stringTemplate
    })
  })
}
