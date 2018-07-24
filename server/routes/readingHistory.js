'use strict'

const router = require('express-promise-router')()

const datastore = require('@google-cloud/datastore')
const moment = require('moment')

const log = require('../logger')
const {getAuth} = require('../auth')
const {getMeta} = require('../list')

// Middleware to record views into Cloud Datastore
router.use(async (req, res, next) => {
  const datastoreClient = await getDatastoreClient()
  req.on('end', () => {
    if (res.locals.docId) {
      const docMeta = getMeta(res.locals.docId)
      const userInfo = req.userInfo
      if (!docMeta || !userInfo) return
      recordView(docMeta, userInfo, datastoreClient)
    }
  })
  next()
})

router.get('/reading-history/docs.json', async (req, res, next) => {
  const results = await fetchHistory(req.userInfo, 'Doc', req.query.limit)
  res.json(results)
})

router.get('/reading-history/teams.json', async (req, res, next) => {
  const results = await fetchHistory(req.userInfo, 'Team', req.query.limit)
  res.json(results)
})

module.exports = {
  middleware: router
}

async function fetchHistory(userInfo, historyType, queryLimit) {
  const datastoreClient = await getDatastoreClient()
  const limit = (parseInt(queryLimit, 10) || 5)
  // include a bit extra that we will filter out based on other criteria later
  const datastoreLimit = Math.ceil(limit * 1.5)
  const results = await Promise.all([
    new Promise((resolve) => {
      const query = datastoreClient.createQuery(['LibraryView' + historyType])
        .filter('userId', '=', userInfo.userId)
        .order('lastViewedAt', { descending: true })
        .limit(datastoreLimit)
      resolve(datastoreClient.runQuery(query))
    }),
    new Promise((resolve) => {
      const query = datastoreClient.createQuery(['LibraryView' + historyType])
        .filter('userId', '=', userInfo.userId)
        .order('lastViewedAt', { descending: true })
        .limit(datastoreLimit)
      resolve(datastoreClient.runQuery(query))
    })
  ])

  const hasName = (result) => {
    return (result && result.doc && result.doc.prettyName) ||
           (result && result.team && result.team.prettyName)
  }

  const recentlyViewed = expandResults(results[1][0])
    .filter(hasName)
    .slice(0, limit)

  const mostViewed = expandResults(results[0][0].filter((r) => { return r.viewCount >= 5 }))
    .filter(hasName)
    .slice(0, limit)

  return {
    recentlyViewed,
    mostViewed
  }
}

// Merge full doc/folder metadata into record retrieved from Cloud Datastore
function expandResults(results) {
  return results.map((result) => {
    result.lastViewed = moment(result.lastViewedAt).fromNow()

    if (result.documentId) result.doc = getMeta(result.documentId) || {}
    if (result.teamId) result.team = getMeta(result.teamId) || {}

    return result
  })
}

async function getDatastoreClient() {
  const gcpProjectId = process.env.GCP_PROJECT_ID || '***REMOVED***'

  const authClient = await getAuth()

  const datastoreClient = datastore({ projectId: gcpProjectId, authClient: authClient })
  return datastoreClient
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
