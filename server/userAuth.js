'use strict'

const router = require('express-promise-router')()

router.use(async (req, res) => {
  req.userInfo = {
    email: 'demo.user@example.com',
    userId: '10',
    // prevents incorrect GA tracking
    analyticsUserId: false
  }

  return 'next'
})

module.exports = router
