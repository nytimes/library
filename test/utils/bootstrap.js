'use strict'

const {google} = require('googleapis')
const express = require('express')

const {initMocks} = require('../utils/googleMock')

initMocks(google)

process.env.NODE_ENV = 'test'
process.env.DRIVE_ID = 'xxxxxtBjEYdigUxxxxxk9PVA'
process.env.GOOGLE_CLIENT_ID = 'abc123'
process.env.GOOGLE_CLIENT_SECRET = 'abc123'
process.env.SESSION_SECRET = 'abc123'
process.env.APPROVED_DOMAINS = 'test.com'

const userInfo = {
  emails: [{value: 'test.user@test.com'}],
  id: '10',
  userId: '10',
  _json: {domain: 'test.com'}
}

express.request.user = userInfo
express.request.userInfo = {
  email: 'test.user@test.com',
  userId: '10',
  analyticsUserId: 'asdfjkl123library'
}
