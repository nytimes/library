'use strict'

const router = require('express-promise-router')()
const {Datastore} = require('@google-cloud/datastore')
const {getAuth} = require('../../server/auth')
const log = require('../../server/logger')

const apiRoutes = {
  '/api/upvote': handleVote(1),
  '/api/downvote': handleVote(-1)
}

async function handleApi(req, res, next) {
  const handler = apiRoutes[req.path]

  if (typeof handler === 'function') {
    handler(req, res, next)
  } else {
    next()
  }
}

function handleVote(vote) {
  return async function (req, res, _) {
    const documentId = req.body.id
    const reason = req.body.reason
    const userInfo = req.userInfo
    const datastoreClient = await getDatastoreClient()

    recordVote(documentId, userInfo, vote, reason, datastoreClient)

    res.send({documentId})
  }
}

router.use(handleApi)

/* Support Functions */

async function getDatastoreClient() {
  const projectId = process.env.GCP_PROJECT_ID
  if (!projectId) {
    log.warn('No GCP_PROJECT_ID provided! Will not connect to GCloud Datastore!')
    return null
  }

  // because auth credentials may be passed in multiple ways, recycle pathway used by main auth logic
  const {email, key} = await getAuth()

  return new Datastore({
    projectId,
    credentials: {
      client_email: email,
      private_key: key
    }
  })
}

async function recordVote(documentId, userInfo, vote, voteReason, datastoreClient) {
  const docKey = datastoreClient.key(['LibraryViewDoc', [userInfo.userId, documentId].join(':')])
  updateVoteRecord(docKey, {documentId, vote, voteReason}, userInfo, datastoreClient)
}

function updateVoteRecord(viewKey, metadata, userInfo, datastoreClient) {
  datastoreClient.get(viewKey)
    .then((results) => {
      const existing = results[0]
      let updatedData

      if (existing) {
        updatedData = existing
        updatedData.vote = metadata.vote
        updatedData.voteDate = new Date()
        updatedData.voteReason = metadata.reason
      } else {
        updatedData = Object.assign({
          userId: userInfo.userId,
          email: userInfo.email,
          voteDate: new Date()
        }, metadata)
      }

      datastoreClient.upsert({
        key: viewKey, data: updatedData
      }).catch((err) => {
        log.error('Failed saving vote data to GCloud datastore:', err)
      })
    }).catch((err) => {
      // TODO: don't attempt to store if datastore is not enabled
      if (err.code === 7) return log.warn('Cloud datastore not enabled. Vote data was not recorded.')
      log.error(err)
    })
}

// error functions are special. They have to be attached directly to the app.
exports.preload = router
