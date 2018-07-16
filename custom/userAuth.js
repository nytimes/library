const express = require('express')

const {verifyIapToken} = require('***REMOVED***')

const router = express.Router()

router.use(verifyIapToken())

module.exports = router
