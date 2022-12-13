'use strict'
const fs = require('fs')
const path = require('path')
const {promisify} = require('util')
const yaml = require('js-yaml')
const {get: deepProp} = require('lodash')
const merge = require('deepmerge')
const mime = require('mime-types')

const log = require('./logger')

const layoutsDir = path.join(__dirname, '../layouts')
const customLayoutsDir = path.join(__dirname, '../custom/layouts')
exports.getTemplates = (subfolder) => {
  const defaultLayouts = fs.readdirSync(path.join(layoutsDir, subfolder)) || []
  let customLayouts = []
  try {
    // NB: This will fail if custom/layouts does not exist.
    customLayouts = fs.readdirSync(path.join(customLayoutsDir, subfolder)) || []
  } catch (err) {
    const level = err.code === 'ENOENT' ? 'debug' : 'warn'
    log[level]('Custom layouts directory not found. Did you mean to include one?')
  }

  return defaultLayouts.concat(customLayouts)
    .reduce((memo, filename) => {
      const [name] = filename.split('.')
      memo.add(name)
      return memo
    }, new Set())
}

// disable spreadsheets from being linked to directly for now
const supportedTypes = new Set(['folder', 'document', 'text/html']) //, 'spreadsheet'])
exports.isSupported = (resourceType) => {
  return supportedTypes.has(resourceType)
}

exports.sortDocs = (a, b) => {
  const hasFolder = a.resourceType === 'folder' || b.resourceType === 'folder'
  if (!hasFolder || a.resourceType === b.resourceType) {
    return a.sort.localeCompare(b.sort)
  }

  return b.resourceType === 'folder' ? 1 : -1
}

// attempts to require from attemptPath. If file isn't present, looks for a
// file of the same name in the server dir
exports.requireWithFallback = (attemptPath) => {
  const baseDir = path.join(__dirname, '..')
  const customPath = path.join(baseDir, 'custom', attemptPath)
  const serverPath = path.join(baseDir, 'server', attemptPath)
  try {
    return require(customPath)
  } catch (err) {
    // if the file exists but we failed to pull it in, log that error at a warning level
    if (err.code !== 'MODULE_NOT_FOUND') {
      log.warn(`Failed pulling in custom file "${attemptPath}" @ ${customPath}. Error was:`, err)
    } else {
      log.debug(`No custom file "${attemptPath}" found in ${customPath}. Did you mean to include one?`)
    }
    return require(serverPath)
  }
}

// Get list of middleware in a directory
const middlewares = fs.existsSync(path.join(__dirname, '../custom/middleware')) ? fs.readdirSync(path.join(__dirname, '../custom/middleware')) : []

// create object with preload and postload middleware functions
exports.allMiddleware = middlewares.reduce((m, item) => {
  const {preload, postload} = require(path.join(__dirname, `../custom/middleware/${item}`))
  return {
    preload: preload ? m.preload.concat(preload) : m.preload,
    postload: postload ? m.postload.concat(postload) : m.postload
  }
}, {
  preload: [], postload: []
})

const config = getConfig()
function getConfig() {
  const defaultExists = fs.existsSync(path.join(__dirname, '../config/strings.yaml'))
  const customExists = fs.existsSync(path.join(__dirname, '../custom/strings.yaml'))

  let config = {}

  if (defaultExists) {
    config = yaml.load(fs.readFileSync(path.join(__dirname, '../config/strings.yaml')), 'utf8') || {}
  }

  if (customExists) {
    const customConfig = yaml.load(fs.readFileSync(path.join(__dirname, '../custom/strings.yaml')), 'utf8') || {}
    config = merge(config, customConfig, {arrayMerge: (config, custom) => custom || config})
  }

  return config
}

exports.getConfig = (configPath) => {
  return deepProp(config, configPath)
}

exports.stringTemplate = (configPath, ...args) => {
  const stringConfig = deepProp(config, configPath)
  const configType = typeof stringConfig

  if (!stringConfig) {
    log.warn(`${configPath} not found in strings.yaml`)
  } else if (configType === 'string') {
    return stringConfig
  } else if (configType === 'function') {
    return stringConfig(...args)
  } else {
    log.warn(`${configType} is not supported`)
  }

  return ''
}

// When we stop supporting Node 8, let's drop promisify for fs.promises.readFile
const readFileAsync = promisify(fs.readFile)
exports.readFileAsync = readFileAsync
exports.assetDataURI = async (filePath) => {
  // If the path starts with `/assets`, look in the app’s public directory
  const publicPath = filePath.replace(/^\/assets/, '/public')

  // We're using path.posix.basename instead of just path.basename here, because
  // publicPath is definitely formatted in the POSIX style, and we want
  // consistent output across *nix and Windows. For reference:
  // https://nodejs.org/api/path.html#path_windows_vs_posix
  const mimeType = mime.lookup(path.posix.basename(publicPath))
  const fullPath = path.join(__dirname, '..', publicPath)

  const data = await readFileAsync(fullPath, {encoding: 'base64'})
  const src = `data:${mimeType};base64,${data}`
  return src
}

exports.pathPrefix = process.env.PATH_PREFIX || '/'

exports.formatUrl = (url) => {
  if (url.match(/^https?:\/\//)) return url
  if (url.startsWith('/')) return exports.pathPrefix + url.slice(1)
  return exports.pathPrefix + url
}
