'use strict'

const router = require('express-promise-router')()
const {Datastore} = require('@google-cloud/datastore')
const {getAuth} = require('../../server/auth')
const log = require('../../server/logger')

const apiRoutes = {
  '/api/hello': handleHello,
  '/api/upvote': handleUpvote,
  '/api/downvote': handleDownvote
}

async function handleApi(req, res, next) {
  const handler = apiRoutes[req.path]

  if (typeof handler === 'function') {
    handler(req, res, next)
  } else {
    next()
  }
}

async function handleHello(req, res, next) {
  const result = await getDocumentById('1CEkEK7NzQ0oXKXZWSTsHfSeqnwohHwVgSjBqB2cOnPM')

  res.send(JSON.stringify(result))
}

async function handleUpvote(req, res, next) {
  const documentId = req.body.id
  const userInfo = req.userInfo
  const document = await getDocumentById(documentId)

  if (document) {
    // Up vote will be a +1
    document.vote = 1
  }

  res.send({documentId})
}

async function handleDownvote(req, res, next) {
  const documentId = req.body.id
  const userInfo = req.userInfo
  const document = await getDocumentById(documentId)

  if (document) {
    // Down vote will be -1
    document.vote = -1
  }

  res.send({message: 'OK'})
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

async function getDocumentById(documentId) {
  const datastore = await getDatastoreClient()

  const query = datastore.createQuery(['LibraryViewDoc']).filter('documentId', '=', documentId)

  const result = await datastore.runQuery(query)

  return result.length > 0 ? result[0] : null
}

// error functions are special. They have to be attached directly to the app.
exports.preload = router
