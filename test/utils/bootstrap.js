'use strict'

const {google} = require('googleapis')

const {initMocks} = require('../utils/googleMock')

initMocks(google)

process.env.NODE_ENV = 'test'
process.env.DRIVE_ID = 'xxxxxtBjEYdigUxxxxxk9PVA'
process.env.GOOGLE_CLIENT_ID = 'abc123'
process.env.GOOGLE_CLIENT_SECRET = 'abc123'
process.env.SESSION_SECRET = 'abc123'
process.env.APPROVED_DOMAINS = 'test.com'
