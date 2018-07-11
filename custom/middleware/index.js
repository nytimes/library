'use strict'

const fs = require('fs')
const log = require('../../server/logger')

exports.preloadMiddleware = (app) => {
  const middlewares = fs.readdirSync(__dirname).filter((item) => !item.includes('index') && item.includes('preload'))
  middlewares.forEach((item) => {
    const requirement = require(`./${item}`)
    log.info(`Requiring ${item} middleware at start of request chain`)
    app.use(requirement)
  })
}

exports.postloadMiddleware = (app) => {
  // middleware not tagged pre or post will default to post
  const middlewares = fs.readdirSync(__dirname).filter((item) => !item.includes('index') && !item.includes('preload'))
  middlewares.forEach((item) => {
    const requirement = require(`./${item}`)
    log.info(`Requiring ${item} middleware at end of request chain`)
    app.use(requirement)
  })
}
