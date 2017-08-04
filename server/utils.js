'use strict'
const fs = require('fs')
const path = require('path')

const layoutsDir = path.join(__dirname, '../layouts')
exports.getTemplates = (subfolder) => {
  return (fs.readdirSync(path.join(layoutsDir, subfolder)) || [])
    .reduce((memo, filename) => {
      const [name] = filename.split('.')
      memo.add(name)
      return memo
    }, new Set())
}

const supportedTypes = new Set(['folder', 'document', 'spreadsheet'])
exports.isSupported = (resourceType) => {
  return supportedTypes.has(resourceType)
}
