'use strict'

const express = require('express')
const {verifyIapToken} = require('***REMOVED***')
const router = express.Router()
const md5 = require('md5')

router.use(verifyIapToken())

// add userInfo to res.locals
router.use((req, res, next) => {
  // In development, use data from an ENV var
  if (process.env.TEST_EMAIL) {
    res.locals.userInfo = {
      email: process.env.TEST_EMAIL,
      userId: '10',
      analyticsUserId: md5('10library')
    }
  } else {
    // pluck data from headers set by iap-verify-middleware
    res.locals.userInfo = {
      email: req.headers['auth.verified_email'],
      userId: req.headers['auth.verified_sub'],
      analyticsUserId: md5(req.headers['auth.verified_sub'] + 'library')
    }
  }
  next()
})

module.exports = router
