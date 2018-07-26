'use strict'

const {google} = require('googleapis')
let datastore = require('@google-cloud/datastore')

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

datastore.prototype.key = () => {}
datastore.prototype.runQuery = (opts) => {
  if (opts[0] === 'LibraryViewDoc') {
    return [
      [
        {
          email: 'test.user@nytimes.com',
          userId: '10',
          lastViewedAt: '2018-07-25T19:54:07.308Z',
          viewCount: 174,
          documentId: 'xxxxxwY_gHO6hpoUBxPlbTY6iHihxxxxxLiHWm'
        },
        {
          email: "test.user@nytimes.com",
          userId: "10",
          lastViewedAt: "2018-07-25T18:45:35.607Z",
          viewCount: 121,
          documentId: "xxxxxjwpW5uRxJmpCITNTw9CNupAsFmm4gUkEXsxxxxx_"
        },
        {
          lastViewedAt: "2018-07-11T14:11:39.409Z",
          viewCount: 118,
          documentId: "xxxxxXF8YewPwFbMfubvVP-oNHpFwHLtkd3Je1hxxxxxhWhlM",
          email: "test.user@nytimes.com",
          userId: "10"
        },
        {
          viewCount: 83,
          documentId: "xxxxx-mJbaYIzAM0_PEPOEQl55TikHKQZKI9Ji3xxxxxDAo7E",
          email: "test.user@nytimes.com",
          userId: "10",
          lastViewedAt: "2018-07-25T15:43:28.334Z"
        }
      ],
      {
        moreResults: "MORE_RESULTS_AFTER_LIMIT",
        endCursor: "asdfasdfadsfadsf"
      }
    ]
  } else {
    return [
      [
        {
          email: "test.user@nytimes.com",
          userId: "10",
          lastViewedAt: "2018-07-25T21:15:27.429Z",
          viewCount: 8,
          documentId: "xxxxxJ7S71V0K0z_P6XvDkdh4aIYO8AbMeVjfXDxxxxxJFbiE"
        },
        {
          email: "test.user@nytimes.com",
          userId: "10",
          lastViewedAt: "2018-07-25T20:45:37.014Z",
          viewCount: 36,
          documentId: "xxxxxZjvhyI8uWoQpCFRmdLrLc5yyD1sjEVCkFrxxxxxdU6JQ"
        },
        {
          lastViewedAt: "2018-07-25T20:23:08.840Z",
          viewCount: 10,
          documentId: "xxxxxhd7b-l4h2N3JfjOtxkudx1Zs0M9g09RporxxxxxBq6z8",
          email: "test.user@nytimes.com",
          userId: "10"
        },
        {
          email: "test.user@nytimes.com",
          userId: "10",
          lastViewedAt: "2018-07-25T20:15:03.458Z",
          viewCount: 1,
          documentId: "xxxxxlLU3WQO9D_BmsCHu0R8teQwiRfNRPRl8AlxxxxxjaVts"
        }
      ],
      {
        moreResults: "MORE_RESULTS_AFTER_LIMIT",
        endCursor: "asdfasdfasdfadsf"
      }
    ]
  }
}
