'use strict'
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const {get: deepProp} = require('lodash')
const merge = require('deepmerge')

const log = require('./logger')

const layoutsDir = path.join(__dirname, '../layouts')
exports.getTemplates = (subfolder) => {
  return (fs.readdirSync(path.join(layoutsDir, subfolder)) || [])
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
  if (process.env.NODE_ENV === 'test') { // only test against prod paths
    return require(path.join(baseDir, 'server', attemptPath))
  }
  try {
    return require(path.join(baseDir, 'custom', attemptPath))
  } catch (e) {
    return require(path.join(baseDir, 'server', attemptPath))
  }
}

// Get list of middleware in a directory
const middlewares = fs.readdirSync(path.join(__dirname, '../custom/middleware'))

// create object with preload and postload middleware functions
exports.allMiddleware = middlewares.reduce((m, item) => {
  const {preload, postload} = require(path.join(__dirname, `../custom/middleware/${item}`))
  return {
    preload: preload ? m.preload.concat(preload) : preload,
    postload: postload ? m.postload.concat(postload) : postload
  }
}, {
  preload: [], postload: []
})

exports.getConfig = () => {
  const defaultExists = fs.existsSync(path.join(__dirname, '../config/strings.yaml'))
  const customExists = fs.existsSync(path.join(__dirname, '../custom/strings.yaml'))

  let config = {}

  if (defaultExists) {
    config = yaml.load(fs.readFileSync(path.join(__dirname, '../config/strings.yaml')), 'utf8') || {}
  }

  if (customExists) {
    const customConfig = yaml.load(fs.readFileSync(path.join(__dirname, '../custom/strings.yaml')), 'utf8') || {}
    config = merge(config, customConfig)
  }

  return config
}

exports.stringTemplate = (configPath, ...args) => {
  const config = exports.getConfig()
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
