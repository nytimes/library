'use strict'

const express = require('express')
const {verifyIapToken} = require('***REMOVED***')
const router = express.Router()
const md5 = require('md5')

router.use(verifyIapToken())

// return userinfo as json
router.get('/whoami.json', (req, res, next) => {
  // In development, use data from an ENV var
  if (process.env.TEST_EMAIL) {
    return res.json({
      email: process.env.TEST_EMAIL,
      userId: '10',
      analyticsUserId: md5('10library')
    })
  }

  res.json({
    email: req.headers['auth.verified_email'],
    userId: req.headers['auth.verified_sub'],
    analyticsUserId: md5(req.headers['auth.verified_sub'] + 'library')
  })
})

module.exports = router
