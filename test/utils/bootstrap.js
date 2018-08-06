'use strict'

const express = require('express')
const googleMock = require('../utils/googleMock')

// Set environment variables for testing
process.env.NODE_ENV = 'test'

// Drive ID matches top level folder in mock drive listing
process.env.DRIVE_ID = 'b1ae9c8be6c34aa155f157207a0c840e'
process.env.GOOGLE_CLIENT_ID = 'abc123'
process.env.GOOGLE_CLIENT_SECRET = 'abc123'
process.env.SESSION_SECRET = 'abc123'
process.env.APPROVED_DOMAINS = 'test.com'

const userInfo = {
  emails: [{value: 'test.user@test.com'}],
  email: 'test.user@test.com',
  analyticsUserId: 'asdfjkl123library',
  id: '10',
  userId: '10',
  _json: {domain: 'test.com'}
}

// express mocks to bypass user auth
express.request.user = userInfo
express.request.userInfo = userInfo
express.request.isAuthenticated = () => true

// drive and datastore mocks
googleMock.init()
