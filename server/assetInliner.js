'use strict'

const fs = require('fs')
const mime = require('mime-types')
const path = require('path')

// Inline local assets, which are usually behind the app’s authentication
// For non-local images, just return the original path.
exports.inlineProtectedAsset = assetPath => {
  // if the path starts with `/assets`, look in the app’s public directory
  const publicPath = assetPath.replace(/^\/assets/, '/public')

  const mimeType = mime.lookup(path.posix.basename(publicPath))
  const fullPath = path.join(__dirname, '..', publicPath)
  // return the original path if there is no matching image
  if (!(mimeType && fs.existsSync(fullPath))) return assetPath

  const encoder = encoders[mimeType] || encoders.base64
  return encoder(fullPath, mimeType)
}

const encoders = {
  'base64': (path, mimeType) => {
    const data = fs.readFileSync(path, { encoding: 'base64' })
    const src = `data:${mimeType};base64,${data}`
    return src
  },
  'text/css': path => fs.readFileSync(path).toString()
}
