'use strict'

const express = require('express')
const router = express.Router()

// return userinfo as json
router.get('/whoami.json', (req, res, next) => {
  res.json(req.userInfo)
})

module.exports = router
