'use strict'

const express = require('express')
const router = express.Router()

// add userInfo to the req object
router.use((req, res, next) => {
  // In development, use data from an ENV var
  if(process.env.TEST_EMAIL) {
    res.locals.userInfo = {
      email: process.env.TEST_EMAIL,
      userId: "10"
    }
  } else {
    // pluck data from headers set by iap-verify-middleware
    res.locals.userInfo = {
      email:  req.headers['auth.verified_email'],
      userId: req.headers['auth.verified_sub']
    }
  }
  next()
})

module.exports = router
