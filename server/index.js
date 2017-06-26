'use strict'

const fs = require('fs')
const path = require('path')

const express = require('express')
const moment = require('moment')

const {getTree, getMeta} = require('./list')
const {fetchDoc, cleanName} = require('./docs')

const indexName = 'home'
const layoutsDir = path.join(__dirname, '../layouts')
const availableLayouts = (fs.readdirSync(layoutsDir) || [])
  .reduce((memo, filename) => {
    const [name] = filename.split('.')
    memo.add(name)
    return memo
  }, new Set())

const app = express()
app.set('view engine', 'ejs')
app.set('views', layoutsDir)

app.get('/healthcheck', (req, res) => {
  res.send('OK')
})

// serve all files in the public folder
app.use('/assets', express.static(path.join(__dirname, '../public')))

app.get('*', (req, res) => {
  console.log(`GET ${req.path}`)
  const segments = req.path.split('/')

  // don't allow viewing index directly
  if (segments.slice(-1)[0] === indexName) {
    return res.redirect(301, segments.slice(0, -1).join('/'))
  }

  // get an up to date doc tree
  getTree((err, tree) => {
    if (err) {
      return res.status(500).send(err)
    }

    const [data, parent] = retrieveDataForPath(req.path, tree)
    const {id, breadcrumb} = data
    if (!id) {
      return res.status(404).end('Not found.')
    }

    const root = segments[1]
    const meta = getMeta(id)
    const layout = availableLayouts.has(root) ? root : 'default'

    // don't try to fetch branch node
    const contextData = prepareContextualData(req.path, breadcrumb, parent, meta.slug)
    const baseRenderData = Object.assign({}, contextData, {
      url: req.path,
      title: meta.prettyName,
      lastUpdatedBy: meta.lastModifyingUser.displayName,
      lastUpdated: moment(meta.modifiedTime).fromNow(),
      createdAt: moment(meta.createdTime).fromNow(),
      editLink: meta.webViewLink
    })

    // if this is a folder, just render from the generic data
    if (meta.mimeType.split('.').pop() === 'folder') {
      return res.render(layout, baseRenderData)
    }

    // for docs, fetch the html and then combine with the base data
    fetchDoc(data.id, (err, {html, originalRevision, sections} = {}) => {
      if (err) {
        return res.status(500).send(err)
      }

      res.render(layout, Object.assign({}, baseRenderData, {
        content: html,
        createdBy: originalRevision.lastModifyingUser.displayName,
        sections
      }))
    })
  })
})

app.listen(3000)

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
  if ((pointer || {}).nodeType === 'branch') {
    parent = pointer

    if (pointer.children[indexName]) {
      pointer = pointer.children[indexName]
    }
  }

  // return the leaf and its immediate branch
  return [pointer || {}, parent]
}

function prepareContextualData(url, breadcrumb, parent, slug) {
  const breadcrumbInfo = breadcrumb.map(({id}) => getMeta(id))

  const self = slug === indexName ? indexName : url.split('/').slice(-1)[0]
  // most of what we are doing here is preparing parents and siblings
  // we need the url and parent object, as well as the breadcrumb to do that
  const siblings = Object.keys(parent.children)
    .filter((slug) => slug !== self && slug !== indexName)
    .map((slug) => {
      const {id} = parent.children[slug] // we should do something here
      const {sort, prettyName, webViewLink} = getMeta(id)

      // on an index page, the base url is the current url
      // for other pages, remove the slug from that url
      const baseUrl = self === indexName ? url : `${url.split('/').slice(0, -1).join('/')}`
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
    parentLinks,
    siblings
  }
}
