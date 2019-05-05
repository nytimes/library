'use strict'
const path = require('path')

const express = require('express')
const csp = require('helmet-csp')

const {middleware: cache} = require('./cache')
const {getMeta} = require('./list')
const {allMiddleware, requireWithFallback} = require('./utils')
const userInfo = require('./routes/userInfo')
const pages = require('./routes/pages')
const categories = require('./routes/categories')
const playlists = require('./routes/playlists')
const readingHistory = require('./routes/readingHistory')
const errorPages = require('./routes/errors')

const userAuth = requireWithFallback('userAuth')
const customCsp = requireWithFallback('csp')

const app = express()

const {preload, postload} = allMiddleware

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../layouts'))

app.get('/healthcheck', (req, res) => {
  res.send('OK')
})

app.use(userAuth)

preload.forEach((middleware) => app.use(middleware))

app.use(userInfo)

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

app.use(pages)
app.use(cache)

// category pages will be cache busted when their last updated timestamp changes
app.use(categories)
app.use(playlists)

postload.forEach((middleware) => app.use(middleware))

// error handler for rendering the 404 and 500 pages, must go last
app.use(errorPages)

// instantiate a top-level express instance that will
//  1. handle static asset requests, skipping auth and other non-CSP middleware
//  2. delegate all other requests to the main app
const server = express()
server.use(csp({directives: customCsp}))
server.use('/assets', express.static(path.join(__dirname, '../public')))
server.use('/', app)

server.listen(parseInt(process.env.PORT || '3000', 10))

module.exports = server
