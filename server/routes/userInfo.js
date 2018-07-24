'use strict'

const express = require('express')
const router = express.Router()

router.get('/whoami.json', (req, res, next) => {
  console.log('req', req.userInfo)
  res.json(req.userInfo)
})

module.exports = router
