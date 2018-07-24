'use strict'

const router = require('express-promise-router')()

// return userinfo as json
router.get('/whoami.json', (req, res, next) => {
  res.json(req.userInfo)
})

module.exports = router
