'use strict'
const path = require('path')

const express = require('express')

const {middleware: cache} = require('./cache')
const userInfo = require('./routes/userInfo')
const pages = require('./routes/pages')
const categories = require('./routes/categories')
const readingHistory = require('./routes/readingHistory')
const {airbrake, errorPages} = require('./routes/errors')

const {getMeta} = require('./list')

const app = express()
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../layouts'))

app.get('/healthcheck', (req, res) => {
  res.send('OK')
})

app.use(userInfo)

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

// main pages
app.use(readingHistory.middleware)
// don't allow using cache for normal pages
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache')
  next()
})

app.use(pages)
app.use(cache)
// category pages will be cache busted when their last updated timestamp changes
app.use(categories)

// errors are special, they must be attached individually
// airbrake fallback and notifier for routes issues
app.use(airbrake)
// error handler for rendering the 404 and 500 pages
app.use(errorPages)

app.listen(3000)

module.exports = app
