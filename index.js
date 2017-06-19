'use strict'

const fs = require('fs')
const path = require('path')

const express = require('express')
const moment = require('moment')

const {getTree, getMeta} = require('./list')
const {fetchDoc, cleanName} = require('./docs')

const availableLayouts = (fs.readdirSync(path.join(__dirname, 'layouts')) || [])
  .reduce((memo, filename) => {
    const [name] = filename.split('.')
    memo.add(name)
    return memo
  }, new Set())

const app = express()
app.set('view engine', 'ejs')
app.set('views', './layouts')

app.get('/healthcheck', (req, res) => {
  res.send('OK')
})

app.get('*', (req, res) => {
  console.log(`GET ${req.path}`)
  // get an up to date doc tree
  getTree((err, tree) => {
    if (err) {
      return res.status(500).send(err)
    }

    const [data, parent] = retrieveDataForPath(req.path, tree)
    const {id, breadcrumb, nodeType} = data
    if (!id) {
      return res.status(404).end('Not found.')
    }

    const meta = getMeta(id)
    const root = req.path.split('/')[1]
    const layout = availableLayouts.has(root) ? root : 'default'

    // don't try to fetch branch node
    if (nodeType === 'branch') {
      return res.status(404).send('Can\'t render contents of a folder yet.')
    }

    // also catch empty folders
    if (meta.mimeType.split('.').pop() === 'folder') {
      return res.status(404).send('It looks like this folder is empty...')
    }

    fetchDoc(data.id, (err, {html, originalRevision} = {}) => {
      if (err) {
        return res.status(500).send(err)
      }

      const renderData = prepareRenderData(meta, html, originalRevision, req.path, breadcrumb, parent)
      res.render(layout, renderData)
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
  if ((pointer || {}).nodeType === 'branch' && pointer.children.index) {
    parent = pointer
    pointer = pointer.children.index
  }

  // return the leaf and its immediate branch
  return [pointer || {}, parent]
}

function prepareRenderData(meta, content, originalRevision, url, breadcrumb, parent) {
  const breadcrumbInfo = breadcrumb.map(({id}) => getMeta(id))

  const self = url.split('/').slice(-1)[0] || 'index'
  const siblings = Object.keys(parent.children)
    .filter((slug) => slug !== self)
    .map((slug) => {
      const {id} = parent.children[slug] // we should do something here
      const {sort, prettyName, webViewLink} = getMeta(id)

      return {
        sort,
        name: prettyName,
        editLink: webViewLink,
        url: `${url.split('/').slice(0, -1).join('/')}/${slug}`
      }
    })
    .sort((a, b) => a.sort > b.sort)

    // we need to do something else here
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
    url,
    content,
    siblings,
    title: meta.prettyName,
    lastUpdatedBy: meta.lastModifyingUser.displayName,
    lastUpdated: moment(meta.modifiedTime).fromNow(), // determine some sort of date here
    createdAt: moment(meta.createdTime).fromNow(), // we won't be able to tell this
    createdBy: originalRevision.lastModifyingUser.displayName,
    editLink: meta.webViewLink,
    parentLinks
  }
}
