'use strict'

const path = require('path')

const express = require('express')
const moment = require('moment')

const {verifyIapToken} = require('***REMOVED***');
const pages = require('./routes/pages')
const categories = require('./routes/categories')
const errors = require('./routes/errors')

const {getMeta} = require('./list')

const app = express()
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../layouts'))

app.use(verifyIapToken())

app.get('/healthcheck', (req, res) => {
  res.send('OK')
})

// serve all files in the public folder
app.use('/assets', express.static(path.join(__dirname, '../public')))

// strip trailing slashes from URLs
app.get(/(.+)\/$/, (req, res, next) => {
  res.redirect(req.params[0])
})

app.get('/view-on-site/:docId', (req, res, next) => {
  const {docId} = req.params
  const doc = getMeta(docId)

  if (!doc) return next(Error('Not found'))

  res.redirect(doc.path)
})

app.use(pages)
app.use(categories)
app.use(errors)

app.listen(3000)
