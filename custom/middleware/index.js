'use strict'

const fs = require('fs')
const log = require('../../server/logger')

function loadMiddleware(app, middlewares) {
  middlewares.forEach((item) => {
    const requirement = require(`./${item}`)
    log.info(`Requiring ${item} middleware`)
    app.use(requirement)
  })
}

exports.preloadMiddleware = (app) => {
  const middlewares = fs.readdirSync(__dirname).filter((item) => !item.includes('index') && item.includes('preload'))
  loadMiddleware(app, middlewares)
}

exports.postloadMiddleware = (app) => {
  // middleware not tagged pre or post will default to post
  const middlewares = fs.readdirSync(__dirname).filter((item) => !item.includes('index') && !item.includes('preload'))
  loadMiddleware(app, middlewares)
}
