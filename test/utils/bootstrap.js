'use strict'

const {google} = require('googleapis')

const {initMocks} = require('../utils/googleMock')

initMocks(google)

process.env.NODE_ENV = 'test'
process.env.DRIVE_ID = 'xxxxxtBjEYdigUxxxxxk9PVA'
