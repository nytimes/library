'use strict'
const path = require('path')

const express = require('express')
const async = require('async')

const {middleware: cache, purge} = require('./cache')
const userInfo = require('./routes/userInfo')
const pages = require('./routes/pages')
const categories = require('./routes/categories')
const readingHistory = require('./routes/readingHistory')
const errorPages = require('./routes/errors')
const {getMeta, getAllRoutes} = require('./list')
const {allMiddleware} = require('./utils')

const app = express()

const {preload, postload} = allMiddleware

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../layouts'))

preload.forEach((middleware) => app.use(middleware))

app.get('/healthcheck', (req, res) => {
  res.send('OK')
})

app.use((req, res, next) => {
  req.useBeta = process.env.BETA_API === 'true' || Object.keys(req.query).includes('beta')
  next()
})

// app.use(userInfo)

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

// don't cache pages client-side to ensure browser always gets latest revision
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache')
  next()
})

// a utility route that can be used to purge everything in the current tree
app.get('/cache-purge-everything', (req, res, next) => {
  const urls = Array.from(getAllRoutes())

  async.parallelLimit(urls.map((url) => {
    return (cb) => purge({url, ignore: 'all'}, cb)
  }), 10, (err, data) => {
    if (err) return next(err)

    res.end('OK')
  })
})

app.use(pages)
app.use(cache)

// category pages will be cache busted when their last updated timestamp changes
app.use(categories)

postload.forEach((middleware) => app.use(middleware))

// error handler for rendering the 404 and 500 pages, must go last
app.use(errorPages)
app.listen(process.env.PORT || 3000)

module.exports = app
