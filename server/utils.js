'use strict'
const fs = require('fs')
const path = require('path')
const md5 = require('md5')
const yaml = require('js-yaml')
const _ = require('lodash')
const log = require('./logger')
const merge = require('deepmerge')

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
  if (process.env.NODE_ENV === 'development') {
    return {
      email: process.env.TEST_EMAIL || 'test.user@nytimes.com',
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

exports.stringTemplate = (configPath, ...args) => {
  const config = getStringConfig()
  const configString = _.get(config, configPath)
  const objType = typeof configString

  if (!configString) {
    log.warn(`${configPath} not found in strings.yml`)
  } else if (objType === 'string') {
    return configString
  } else if (objType === 'function') {
    return configString(...args)
  } else {
    log.warn(`${objType} is not supported`)
  }

  return ''
}

const getStringConfig = () => {
  const defaultExists = fs.existsSync(path.join(__dirname, '../config/strings.yaml')) 
  const customExists = fs.existsSync(path.join(__dirname, '../custom/strings.yaml'))

  var config = {}

  if (defaultExists) {
    config = yaml.load(fs.readFileSync(path.join(__dirname, '../config/strings.yaml')), 'utf8')
  }

  if (customExists) {
    const customConfig = yaml.load(fs.readFileSync(path.join(__dirname, '../custom/strings.yaml')), 'utf8')
    config = merge(config, customConfig)
  }

  return config
}

exports.config = getStringConfig()
