'use strict'

const fs = require('fs')
const log = require('../logger')

exports.init = (app) => {
  const middlewares = fs.readdirSync(__dirname).filter((item) => !item.includes('index'))
  middlewares.forEach((item) => {
    const requirement = require(`./${item}`)
    log.info(`Requiring ${item} as middleware`)
    app.use(requirement)
  })
}
