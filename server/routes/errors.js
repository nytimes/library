'use strict'

const log = require('../logger')
const {stringTemplate} = require('../utils')

// generic error handler to return error pages to user
module.exports = (err, req, res, next) => {
  const messages = {
    'Not found': 404,
    'Unauthorized': 403
  }

  const code = messages[err.message] || 500
  log.error(`Serving an error page for ${req.url}`, err)
  res.status(code).render(`errors/${code}`, {
    err,
    template: stringTemplate,
    useInlineStyles: true
  })
}
