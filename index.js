'use strict'

const fs = require('fs')
const path = require('path')

const express = require('express')

const {getTree, getMeta, getChildren} = require('./list')
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

    const data = retrieveDataForPath(req.path, tree)
    const {id, breadcrumb, nodeType} = data
    if (!id) {
      return res.status(404).end('Not found.')
    }

    const meta = getMeta(id)
    const root = req.path.split('/')[1]
    const layout = availableLayouts.has(root) ? root : 'default'

    // don't try to fetch a folder
    if (nodeType === 'branch') {
      res.status(404).send('Can\'t render contents of a folder yet.')
    }

    fetchDoc(data.id, (err, {html, originalRevision}) => {
      if (err) {
        return res.status(500).send(err)
      }

      const renderData = prepareRenderData(meta, html, originalRevision, req.path, breadcrumb)
      res.render(layout, renderData)
    })
  })
})

app.listen(3000)

function retrieveDataForPath(path, tree) {
  const segments = path.split('/').slice(1).filter((s) => s.length)
  // check if we have anything that matches the path
  let pointer = path === '/' ? tree : tree[segments.shift()]
  while (pointer && segments.length) {
    pointer = pointer[segments.shift()]
  }

  if (pointer.nodeType === 'branch' && pointer.index) {
    console.log(pointer.index)
    pointer = pointer.index
  }

  return pointer || {}
}

function prepareRenderData(meta, content, originalRevision, url, breadcrumb) {
  const breadcrumbInfo = breadcrumb.map((id) => getMeta(id))
  const [immediateParent] = breadcrumb.slice(-1)

  const siblings = getChildren(immediateParent) || []
    .filter((id) => id !== meta.id)
    .map((id) => getMeta(id))

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
    siblings, // Populate this with the names of other items in the same folder
    title: cleanName(meta.name),
    lastUpdatedBy: meta.lastModifyingUser.displayName,
    lastUpdated: meta.modifiedTime, // determine some sort of date here
    createdAt: meta.createdTime, // we won't be able to tell this
    createdBy: originalRevision.lastModifyingUser.displayName,
    editLink: meta.webViewLink,
    parentLinks
  }
}
