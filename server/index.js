'use strict'
const path = require('path')

const express = require('express')
const csp = require('helmet-csp')

const {middleware: cache} = require('./cache')
const {getMeta} = require('./list')
const {formatUrl, allMiddleware, requireWithFallback} = require('./utils')
const userInfo = require('./routes/userInfo')
const pages = require('./routes/pages')
const categories = require('./routes/categories')
const playlists = require('./routes/playlists')
const readingHistory = require('./routes/readingHistory')
const redirects = require('./routes/redirects')
const errorPages = require('./routes/errors')

const userAuth = requireWithFallback('userAuth')
const customCsp = requireWithFallback('csp')

const app = express()

const {preload, postload} = allMiddleware

// The trust proxy flag tells the app to use https for links
// and redirect urls if it sees indications that the request
// passed through a proxy and was originally sent using https
if ((process.env.TRUST_PROXY || '').toUpperCase() === 'TRUE') {
  app.enable('trust proxy')
}

app.set('view engine', 'ejs')
app.set('views', [path.join(__dirname, '../custom/layouts'), path.join(__dirname, '../layouts')])

app.get(formatUrl('/healthcheck'), (req, res) => {
  res.send('OK')
})

app.use(csp({directives: customCsp}))
app.use(formatUrl('/'), userAuth)

preload.forEach((middleware) => app.use(middleware))

app.use(formatUrl('/'), userInfo)

// serve all files in the public folder
app.use(formatUrl('/assets'), express.static(path.join(__dirname, '../public')))

// strip trailing slashes from URLs
app.get(/(.+)\/$/, (req, res, next) => {
  res.redirect(req.params[0])
})

app.get(formatUrl('/view-on-site/:docId'), (req, res, next) => {
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

// treat requests ending in .json as application/json
app.use((req, res, next) => {
  if (req.path.endsWith('.json')) {
    req.headers.accept = 'application/json'
    req.url = req.baseUrl + req.path.slice(0, -5)
  }
  next()
})

app.use(formatUrl('/'), pages)
app.use(formatUrl('/'), cache)

// category pages will be cache busted when their last updated timestamp changes
app.use(formatUrl('/'), categories)
app.use(formatUrl('/'), playlists)

postload.forEach((middleware) => app.use(middleware))

// if no page has been served, check for a redirect before erroring
app.use(formatUrl('/'), redirects)

// error handler for rendering the 404 and 500 pages, must go last
app.use(formatUrl('/'), errorPages)

// If we are called directly, listen on port 3000, otherwise don't

if (require.main === module) {
  app.listen(parseInt(process.env.PORT || '3000', 10))
}

module.exports = app
