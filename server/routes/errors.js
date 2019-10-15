'use strict'

const log = require('../logger')
const {assetDataURI, readFileAsync, stringTemplate} = require('../utils')

let assetCache

// Because asset requests are authenticated, we inline the images and CSS
// that we need to serve to logged-out users, e.g. on the auth error page.
async function loadInlineAssets() {
  if (assetCache) return assetCache

  const assets = {}

  // Load the core stylesheet.
  // If want to add support for base64-encoding background-image URLs,
  // we could augment this function with a regex that replaces each URL pattern
  // in public/css/errors.css with the result of a call to assetDataURI()
  const cssLoader = async () => {
    const css = await readFileAsync('public/css/errors.css')
    assets.css = css.toString()
  }

  const assetLoaders = ['branding.icon', 'branding.favicon'].map((key) => {
    // Load essential images as base64 data-URIs
    const loader = async () => {
      try {
        const img = await assetDataURI(stringTemplate(key))
        assets[key] = img
      } catch (err) {
        // It's okay for users to reference non-local or non-existent files
        // here, but any other error should throw.
        if (err.code !== 'ENOENT') throw err
      }
    }
    return loader()
  }).concat(cssLoader())

  assets.stringTemplate = (key, ...args) => {
    return assets[key] || stringTemplate(key, ...args)
  }

  try {
    await Promise.all(assetLoaders)
    // Store the inlined assets in memory for subsequent requests
    assetCache = assets
  } catch (error) {
    log.warn(`Error ${error.code} inlining assets!`)
    log.info(error)
    log.info('Falling back to linked assets instead')
  }

  return assets
}

// generic error handler to return error pages to user
module.exports = async (err, req, res, next) => {
  const messages = {
    'Not found': 404,
    'Unauthorized': 403
  }

  const code = messages[err.message] || 500
  log.error(`Serving an error page for ${req.url}`, err)
  const inlined = await loadInlineAssets()
  res.status(code).render(`errors/${code}`, {
    inlineCSS: inlined.css,
    err,
    template: inlined.stringTemplate
  })
}
