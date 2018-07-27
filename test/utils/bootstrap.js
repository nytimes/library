'use strict'

const {google} = require('googleapis')
const datastore = require('@google-cloud/datastore')

const express = require('express')

const {initMocks} = require('../utils/googleMock')

initMocks(google)

process.env.NODE_ENV = 'test'

// Drive ID matches top level folder in mock drive listing
process.env.DRIVE_ID = 'xxxxxtBjEYdigUxxxxxk9PVA'
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

express.request.user = userInfo
express.request.userInfo = userInfo

datastore.prototype.key = () => {}
// datastore.prototype.createQuery = (q) => mockDatastoreQuery(q)

datastore.prototype.runQuery = ({
  kinds
}) => {
  const kind = kinds[0]
  if (kind === 'LibraryViewDoc') {
    return [
      [{
        email: 'test.user@nytimes.com',
        userId: '10',
        lastViewedAt: '2018-07-25T21:15:27.429Z',
        viewCount: 8,
        documentId: 'xxxxxJ7S71V0K0z_P6XvDkdh4aIYO8AbMeVjfXDxxxxxJFbiE'
      },
      {
        email: 'test.user@nytimes.com',
        userId: '10',
        lastViewedAt: '2018-07-25T20:45:37.014Z',
        viewCount: 36,
        documentId: 'xxxxxZjvhyI8uWoQpCFRmdLrLc5yyD1sjEVCkFrxxxxxdU6JQ'
      },
      {
        lastViewedAt: '2018-07-25T20:23:08.840Z',
        viewCount: 10,
        documentId: 'xxxxxhd7b-l4h2N3JfjOtxkudx1Zs0M9g09RporxxxxxBq6z8',
        email: 'test.user@nytimes.com',
        userId: '10'
      },
      {
        email: 'test.user@nytimes.com',
        userId: '10',
        lastViewedAt: '2018-07-25T20:15:03.458Z',
        viewCount: 1,
        documentId: 'xxxxxlLU3WQO9D_BmsCHu0R8teQwiRfNRPRl8AlxxxxxjaVts'
      }
      ],
      {
        moreResults: 'MORE_RESULTS_AFTER_LIMIT',
        endCursor: 'xxxxxxxx'
      }
    ]
  } else {
    return [
      [{
        email: 'test.user@nytimes.com',
        userId: '10',
        lastViewedAt: '2018-07-25T19:50:46.280Z',
        viewCount: 236,
        teamId: 'xxxxxbiOr5xN_Z3RpbERYdnxxxxxd1TDQ'
      },
      {
        lastViewedAt: '2018-06-29T16:45:55.455Z',
        viewCount: 55,
        teamId: 'xxxxxCF5lovN5fv1FY5JGMHChB7Ixxxxxn7sSX',
        email: 'test.user@nytimes.com',
        userId: '10'
      },
      {
        viewCount: 23,
        teamId: 'xxxxxHdNDs0WL7UROAgvR6PpeOQ4xxxxxbzc85',
        email: 'test.user@nytimes.com',
        userId: '10',
        lastViewedAt: '2018-07-23T20:04:40.524Z'
      },
      {
        lastViewedAt: '2018-07-24T17:13:56.773Z',
        viewCount: 21,
        teamId: 'xxxxxJOeJisUARNajc1er77iUqbRxxxxx1JLRT',
        email: 'test.user@nytimes.com',
        userId: '10'
      },
      {
        teamId: 'xxxxxyeFAwx1EW0VNs3yVacUXRVoxxxxxsV21W',
        email: 'test.user@nytimes.com',
        userId: '10',
        lastViewedAt: '2017-09-08T15:48:55.751Z',
        viewCount: 12
      }
      ], {
        'moreResults': 'NO_MORE_RESULTS',
        'endCursor': 'xxxxxxxx'
      }
    ]
  }
}
