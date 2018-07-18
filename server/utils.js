'use strict'
const fs = require('fs')
const path = require('path')
const md5 = require('md5')
const yaml = require('js-yaml')
const {get: deepProp} = require('lodash')
const log = require('./logger')
const merge = require('deepmerge')

const config = getConfig()

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

exports.getUserInfo = (req) => {
  // In development, use stub data
  if (process.env.NODE_ENV === 'development' || process.env.HEROKU) {
    return {
      email: process.env.TEST_EMAIL || config.footer.defaultEmail,
      userId: '10',
      analyticsUserId: md5('10library')
    }
  }

  return {
    email: req.headers['auth.verified_email'],
    userId: req.headers['auth.verified_sub'],
    analyticsUserId: md5(req.headers['auth.verified_sub'] + 'library')
  }
}

// attempts to require from attemptPath. If file isn't present, looks for a
// file of the same name in the server dir
exports.requireWithFallback = (attemptPath) => {
  const baseDir = path.join(__dirname, '..')
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

function getConfig() {
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
  const config = getConfig()
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
