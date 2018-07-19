'use strict'

const express = require('express')
const md5 = require('md5')

const {verifyIapToken} = require('***REMOVED***')

const router = express.Router()

router.use(verifyIapToken())

router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    req.userInfo = {
      email: process.env.TEST_EMAIL || '***REMOVED***',
      userId: '10',
      analyticsUserId: md5('10library')
    }
    next()
    return
  }
  req.userInfo = {
    email: req.headers['auth.verified_email'],
    userId: req.headers['auth.verified_sub'],
    analyticsUserId: md5(req.headers['auth.verified_sub'] + 'library')
  }
  next()
})

module.exports = router
