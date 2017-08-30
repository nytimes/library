'use strict'

const express = require('express')
const router = express.Router()

const async = require('async')
const datastore = require('@google-cloud/datastore')
const moment = require('moment')

const log = require('../logger')
const {getAuth} = require('../auth')
const {getMeta} = require('../list')
const {getUserInfo} = require('../utils')

router.use((req, res, next) => {
  getDatastoreClient((datastoreClient) => {
    req.on('end', () => {
      if (res.locals.userInfo && res.locals.docId) {
        recordView(res.locals.docId, res.locals.userInfo, datastoreClient)
      }
    })
    next()
  })
})

router.get('/reading-history.json', (req, res, next) => {
  fetchHistory(getUserInfo(req), req.query.queryLimit, (err, results) => {
    if (err) return next(err)
    res.json(results)
  })
})

module.exports = {
  middleware: router
}

function fetchHistory(userInfo, queryLimit, doneCb) {
  getDatastoreClient((datastoreClient) => {
    const limit = parseInt(queryLimit) || 4
    async.parallel([
      (cb) => {
        const query = datastoreClient.createQuery(['LibraryView'])
          .filter('userId', '=', userInfo.userId)
          .order('viewCount', { descending: true })
          .limit(limit)

        datastoreClient.runQuery(query, cb)
      },
      (cb) => {
        const query = datastoreClient.createQuery(['LibraryView'])
          .filter('userId', '=', userInfo.userId)
          .order('lastViewedAt', { descending: true })
          .limit(limit)

        datastoreClient.runQuery(query, cb)
      }
    ], (err, results) => {
      if (err) {
        doneCb(err)
      } else {
        doneCb(null, {
          recentlyViewed: expandResults(results[1][0]),
          mostViewed: expandResults(results[0][0])
        })
      }
    })
  })
}

function expandResults(results) {
  return results.map((result) => {
    result.lastViewed = moment(result.lastViewedAt).fromNow()
    result.doc = getMeta(result.documentId) || {}
    return result
  })
}

function getDatastoreClient(cb) {
  getAuth((authClient) => {
    const datastoreClient = datastore({ projectId: '***REMOVED***', auth: authClient })
    cb(datastoreClient)
  })
}

function recordView(docId, userInfo, datastoreClient) {
  const viewId = [userInfo.userId, docId].join(':')
  const viewKey = datastoreClient.key(['LibraryView', viewId])

  datastoreClient.get(viewKey)
    .then((results) => {
      const existing = results[0]
      let updatedData

      if (existing) {
        updatedData = existing
        existing.viewCount += 1
        existing.lastViewedAt = new Date()
      } else {
        updatedData = {
          documentId: docId,
          userId: userInfo.userId,
          email: userInfo.email,
          viewCount: 1,
          lastViewedAt: new Date()
        }
      }

      datastoreClient.upsert({
        key: viewKey, data: updatedData
      }).catch((err) => {
        log.error('Failed saving reading history to GCloud datastore:', err)
      })
    })
}
