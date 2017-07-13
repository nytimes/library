'use strict'

const fs = require('fs')
const path = require('path')

const express = require('express')
const moment = require('moment')

const {getTree, getMeta} = require('./list')
const {fetchDoc, cleanName} = require('./docs')
const search = require('./search')

const indexName = 'home'
const layoutsDir = path.join(__dirname, '../layouts')
const pages = getTemplates('pages')
const categories = getTemplates('categories')

const app = express()
app.set('view engine', 'ejs')
app.set('views', layoutsDir)

app.get('/healthcheck', (req, res) => {
  res.send('OK')
})

// serve all files in the public folder
app.use('/assets', express.static(path.join(__dirname, '../public')))

// strip trailing slashes from URLs
app.get(/(.+)\/$/, (req, res, next) => {
  res.redirect(req.params[0])
})

app.get('/', handlePage)
app.get('/:page', handlePage)

app.get('/view-on-site/:docId', (req, res, next) => {
  const {docId} = req.params
  const doc = getMeta(docId)

  if (!doc) return next(Error('Not found'))

  res.redirect(doc.path)
})

app.get('*', (req, res, next) => {
  console.log(`GET ${req.path}`)
  const segments = req.path.split('/')

  // don't allow viewing index directly
  if (segments.slice(-1)[0] === indexName) {
    return res.redirect(301, segments.slice(0, -1).join('/'))
  }

  // get an up to date doc tree
  getTree((err, tree) => {
    if (err) {
      return next(err)
    }

    const [data, parent] = retrieveDataForPath(req.path, tree)
    const {id, breadcrumb} = data
    if (!id) {
      return next(Error('Not found'))
    }

    const root = segments[1]
    const meta = getMeta(id)
    const layout = categories.has(root) ? root : 'default'
    const template = `categories/${layout}`

    // don't try to fetch branch node
    const contextData = prepareContextualData(req.path, breadcrumb, parent, meta.slug)
    const baseRenderData = Object.assign({}, contextData, {
      url: req.path,
      title: meta.prettyName,
      lastUpdatedBy: meta.lastModifyingUser.displayName,
      lastUpdated: meta.lastUpdated,
      createdAt: moment(meta.createdTime).fromNow(),
      editLink: meta.webViewLink
    })

    // if this is a folder, just render from the generic data
    if (meta.resourceType === 'folder') {
      return res.render(template, baseRenderData)
    }

    // for docs, fetch the html and then combine with the base data
    fetchDoc(data.id, (err, {html, originalRevision, sections} = {}) => {
      if (err) {
        return next(err)
      }

      res.render(template, Object.assign({}, baseRenderData, {
        content: html,
        createdBy: originalRevision.lastModifyingUser.displayName,
        sections
      }))
    })
  })
})

if (process.env.AIRBRAKE_PROJECT_ID) { initAirbrake() }
app.use(errorPages)

app.listen(3000)

function getTemplates(subfolder) {
  return (fs.readdirSync(path.join(layoutsDir, subfolder)) || [])
    .reduce((memo, filename) => {
      const [name] = filename.split('.')
      memo.add(name)
      return memo
    }, new Set())
}

function handlePage(req, res, next) {
  const page = req.params.page || 'index'

  if (!pages.has(page)) {
    return next()
  }

  const template = `pages/${page}`
  const {q} = req.query
  if (page === 'search' && q) {
    return search.run(q, (err, results) => {
      if (err) return next(err)
      res.render(template, {q, results})
    })
  }

  if (page === 'categories' || page === 'index') {
    return getTree((err, tree) => {
      if (err) return next(err)
      const categories = buildDisplayCategories(tree)
      res.render(template, {categories})
    })
  }

  res.render(template)
}

function buildDisplayCategories(tree) {
  let categories = Object.keys(tree.children).map((key) => {
    let data = tree.children[key]
    data.path = `/${key}` // for now
    return data
  })

  // Ignore pages at the root of the site on the category page
  categories = categories.filter((child) => { return child.nodeType === 'branch' })

  // For now, sort alphabetically:
  categories = categories.sort((a, b) => { return a.sort.localeCompare(b.sort) })

  categories = categories.map((category) => {
    category = Object.assign({}, category)
    category.children = Object.values(category.children).map((child) => {
      return getMeta(child.id)
    })
    return category
  })

  return categories
}

function retrieveDataForPath(path, tree) {
  const segments = path.split('/').slice(1).filter((s) => s.length)

  let pointer = tree
  let parent = null
  // continue traversing down the tree while there are still segements to go
  while ((pointer || {}).nodeType === 'branch' && segments.length) {
    parent = pointer
    pointer = pointer.children[segments.shift()]
  }

  // if we used up segments and are looking at a folder, try index
  if ((pointer || {}).nodeType === 'branch' && pointer.home) {
    parent = pointer
    pointer = Object.assign({}, pointer, {id: pointer.home})
  }

  // return the leaf and its immediate branch
  return [pointer || {}, parent]
}

function prepareContextualData(url, breadcrumb, parent, slug) {
  const breadcrumbInfo = breadcrumb.map(({id}) => getMeta(id))

  const {children, id, home, nodeType} = parent
  const isHome = home || nodeType === 'branch'
  const self = isHome ? null : url.split('/').slice(-1)[0]
  // most of what we are doing here is preparing parents and siblings
  // we need the url and parent object, as well as the breadcrumb to do that
  const siblings = Object.keys(children)
    .filter((slug) => slug !== self)
    .map((slug) => {
      const {id} = children[slug]
      const {sort, prettyName, webViewLink} = getMeta(id)

      // on an index page, the base url is the current url
      // for other pages, remove the slug from that url
      const baseUrl = isHome ? url : `${url.split('/').slice(0, -1).join('/')}`
      return {
        sort,
        name: prettyName,
        editLink: webViewLink,
        url: path.join(baseUrl, slug)
      }
    })
    .sort((a, b) => a.sort > b.sort)

  const parentLinks = url
    .split('/')
    .slice(1, -1) // ignore the base empty string and self
    .map((segment, i, arr) => {
      return {
        url: `/${arr.slice(0, i + 1).join('/')}`,
        name: cleanName(breadcrumbInfo[i].name),
        editLink: breadcrumbInfo[i].webViewLink
      }
    })

  return {
    parentId: id,
    parentLinks,
    siblings
  }
}

function initAirbrake() {
  const airbrake = require('airbrake').createClient(
    process.env.AIRBRAKE_PROJECT_ID,
    process.env.AIRBRAKE_API_KEY
  )
  airbrake.addFilter((notice) => {
    // Don't report 404s to Airbrake
    if (notice.errors[0].message === 'Not found') {
      return null
    }

    return notice
  })
  app.use(airbrake.expressHandler())
}

// generic error handler to return error pages to user
function errorPages(err, req, res, next) {
  const code = err.message === 'Not found' ? 404 : 500
  console.log('Received an error!', err)
  res.status(code).render(`errors/${code}`, {err})
}
