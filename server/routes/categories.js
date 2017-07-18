'use strict'

const express = require('express')
const moment = require('moment')
const path = require('path')

const router = express.Router()

const {getTree, getMeta} = require('../list')
const {fetchDoc, cleanName, fetchByline} = require('../docs')
const {getTemplates} = require('../utils')

router.get('*', handleCategory)
module.exports = router

const categories = getTemplates('categories')
function handleCategory(req, res, next) {
  console.log(`GET ${req.path}`)
  const segments = req.path.split('/')

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
    const contextData = prepareContextualData(data, req.path, breadcrumb, parent, meta.slug)
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

      res.locals.docId = data.id

      let payload = fetchByline(html, originalRevision.lastModifyingUser.displayName)
      
      res.render(template, Object.assign({}, baseRenderData, {
        content: payload.html,
        byline: payload.byline,
        createdBy: originalRevision.lastModifyingUser.displayName,
        sections
      }))
    })
  })
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

  // if we are going to view a directory, switch to the home doc where possible
  if ((pointer || {}).nodeType === 'branch' && pointer.home) {
    pointer = Object.assign({}, pointer, {id: pointer.home})
  }

  // return the leaf and its immediate branch
  return [pointer || {}, parent]
}

function prepareContextualData(data, url, breadcrumb, parent, slug) {
  const breadcrumbInfo = breadcrumb.map(({id}) => getMeta(id))

  const {children: siblings, id} = parent
  const {children} = data
  const self = url.split('/').slice(-1)[0]
  // most of what we are doing here is preparing parents and siblings
  // we need the url and parent object, as well as the breadcrumb to do that
  const siblingLinks = createRelatedList(siblings, self, `${url.split('/').slice(0, -1).join('/')}`)
  const childrenLinks = createRelatedList(children || {}, self, url)

  // extend the breadcrumb with render data
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
    siblings: siblingLinks,
    children: childrenLinks
  }
}

function createRelatedList(slugs, self, baseUrl) {
  return Object.keys(slugs)
    .filter((slug) => slug !== self)
    .map((slug) => {
      const {id, nodeType} = slugs[slug]
      const {sort, prettyName, webViewLink} = getMeta(id)
      return {
        sort,
        nodeType,
        name: prettyName,
        editLink: webViewLink,
        url: path.join(baseUrl, slug)
      }
    })
    .sort((a, b) => a.sort > b.sort)
}
