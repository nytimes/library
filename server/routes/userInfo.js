'use strict'

const express = require('express')
const router = express.Router()
const {getUserInfo} = require('../utils')

// return userinfo as json
router.get('/whoami.json', (req, res, next) => {
  res.json(getUserInfo(req))
})

module.exports = router
