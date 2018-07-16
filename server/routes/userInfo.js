'use strict'

const express = require('express')
const {verifyIapToken} = require('***REMOVED***')
const router = express.Router()
const {getUserInfo} = require('../utils')

// router.use(verifyIapToken())

// return userinfo as json
router.get('/whoami.json', (req, res, next) => {
  res.json(getUserInfo(req))
})

module.exports = router
