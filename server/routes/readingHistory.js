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

// Middleware to record views into Cloud Datastore
router.use((req, res, next) => {
  getDatastoreClient((datastoreClient) => {
    req.on('end', () => {
      if (res.locals.docId) {
        const docMeta = getMeta(res.locals.docId)
        const userInfo = getUserInfo(req)
        recordView(docMeta, userInfo, datastoreClient)
      }
    })
    next()
  })
})

router.get('/reading-history/docs.json', (req, res, next) => {
  fetchHistory(getUserInfo(req), 'Doc', req.query.limit, (err, results) => {
    if (err) return next(err)
    res.json(results)
  })
})

router.get('/reading-history/teams.json', (req, res, next) => {
  fetchHistory(getUserInfo(req), 'Team', req.query.limit, (err, results) => {
    if (err) return next(err)
    res.json(results)
  })
})

module.exports = {
  middleware: router
}

function fetchHistory(userInfo, historyType, queryLimit, doneCb) {
  getDatastoreClient((datastoreClient) => {
    const limit = parseInt(queryLimit, 10) || 5
    async.parallel([
      (cb) => {
        const query = datastoreClient.createQuery(['LibraryView' + historyType])
          .filter('userId', '=', userInfo.userId)
          .order('viewCount', { descending: true })
          .limit(limit)

        datastoreClient.runQuery(query, cb)
      },
      (cb) => {
        const query = datastoreClient.createQuery(['LibraryView' + historyType])
          .filter('userId', '=', userInfo.userId)
          .order('lastViewedAt', { descending: true })
          .limit(limit)

        datastoreClient.runQuery(query, cb)
      }
    ], (err, results) => {
      if (err) {
        doneCb(err)
      } else {
        const recentlyViewed = expandResults(results[1][0])
        const mostViewed = expandResults(results[0][0].filter((r) => { return r.viewCount >= 5 }))
        doneCb(null, {
          recentlyViewed,
          mostViewed
        })
      }
    })
  })
}

// Merge full doc/folder metadata into record retrieved from Cloud Datastore
function expandResults(results) {
  return results.map((result) => {
    result.lastViewed = moment(result.lastViewedAt).fromNow()

    if (result.documentId) {
      result.doc = getMeta(result.documentId) || {}
    }

    if (result.teamId) {
      result.team = getMeta(result.teamId) || {}
    }

    return result
  })
}

function getDatastoreClient(cb) {
  const gcpProjectId = process.env.GCP_PROJECT_ID || '***REMOVED***'
  getAuth((authClient) => {
    const datastoreClient = datastore({ projectId: gcpProjectId, auth: authClient })
    cb(datastoreClient)
  })
}

function recordView(docMeta, userInfo, datastoreClient) {
  const docKey = datastoreClient.key(['LibraryViewDoc', [userInfo.userId, docMeta.id].join(':')])
  updateViewRecord(docKey, { documentId: docMeta.id }, userInfo, datastoreClient)

  if (docMeta.topLevelFolder && docMeta.topLevelFolder.tags.includes('team')) {
    const teamId = docMeta.topLevelFolder.id
    const teamKey = datastoreClient.key(['LibraryViewTeam', [userInfo.userId, teamId].join(':')])
    updateViewRecord(teamKey, { teamId: teamId }, userInfo, datastoreClient)
  }
}

// shared function to increment counters in Cloud Datastore, or create a new view record
// if one does not already exist
function updateViewRecord(viewKey, metadata, userInfo, datastoreClient) {
  datastoreClient.get(viewKey)
    .then((results) => {
      const existing = results[0]
      let updatedData

      if (existing) {
        updatedData = existing
        existing.viewCount += 1
        existing.lastViewedAt = new Date()
      } else {
        updatedData = Object.assign({
          userId: userInfo.userId,
          email: userInfo.email,
          viewCount: 1,
          lastViewedAt: new Date()
        }, metadata)
      }

      datastoreClient.upsert({
        key: viewKey, data: updatedData
      }).catch((err) => {
        log.error('Failed saving reading history to GCloud datastore:', err)
      })
    })
}
