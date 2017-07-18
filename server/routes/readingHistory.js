'use strict'

const express = require('express')
const router = express.Router()

const datastore = require('@google-cloud/datastore')
const {getAuth} = require('../auth')

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

router.get('/me', (req, res) => {
  fetchHistory(res.locals.userInfo, (err, results) => {
    res.send(JSON.stringify(results))
  })
})

function fetchHistory(userInfo, cb) {
  getDatastoreClient((datastoreClient) => {
    const query = datastoreClient.createQuery(['LibraryView'])
      .filter('userId', '=', userInfo.userId)
      .order('viewCount', { descending: true })
      .limit(10)

    datastoreClient.runQuery(query, cb)
  })
}

module.exports = {
  middleware: router
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
        existing.lastViewed = new Date()
      } else {
        updatedData = {
          documentId: docId,
          userId: userInfo.userId,
          emailAddress: userInfo.emailAddress,
          viewCount: 1,
          lastViewed: new Date()
        }
      }

      datastoreClient.upsert({
        key: viewKey, data: updatedData
      }).catch((err) => {
        console.error(`ERROR: ${err}`)
      })
    })
}
