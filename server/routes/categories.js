'use strict'

const moment = require('moment')

const router = require('express-promise-router')()

const cache = require('../cache')
const log = require('../logger')
const {getTree, getMeta} = require('../list')
const {fetchDoc, cleanName, fetchByline} = require('../docs')
const {getTemplates, sortDocs, stringTemplate} = require('../utils')

router.get('*', handleCategory)
module.exports = router

const categories = getTemplates('categories')
async function handleCategory(req, res) {
  console.log('handling categories')
  log.info(`GET ${req.path}`)
  const segments = req.path.split('/')

  // get an up to date doc tree
  const tree = await getTree()
  const [data, parent] = retrieveDataForPath(req.path, tree)
  const {id, breadcrumb} = data
  if (!id) throw new Error('Not found')

  const root = segments[1]
  const meta = getMeta(id)
  console.log(meta)
  const {mimeType} = meta
  const layout = categories.has(root) ? root : 'default'
  const template = `categories/${layout}`

  // don't try to fetch branch node
  const contextData = prepareContextualData(data, req.path, breadcrumb, parent, meta.slug)

  const baseRenderData = Object.assign({}, contextData, {
    url: req.path,
    title: meta.prettyName,
    lastUpdatedBy: (meta.lastModifyingUser || {}).displayName,
    modifiedAt: meta.modifiedTime,
    createdAt: moment(meta.createdTime).fromNow(),
    editLink: mimeType === 'text/html' ? meta.folder.webViewLink : meta.webViewLink,
    id,
    template: stringTemplate
  })

  // if this is a folder, just render from the generic data
  const {resourceType} = meta
  if (resourceType === 'folder') {
    console.log('rendering folder', baseRenderData)
    return res.render(template, baseRenderData, (err, html) => {
      if (err) throw err

      cache.add(id, meta.modifiedTime, req.path, html)
      res.end(html)
    })
  }

  // for docs, fetch the html and then combine with the base data
  const {html, originalRevision, sections} = await fetchDoc(id, resourceType, req)
  res.locals.docId = data.id // we need this for history later
  const revisionData = originalRevision.data
  const payload = fetchByline(html, revisionData.lastModifyingUser.displayName)
  res.render(template, Object.assign({}, baseRenderData, {
    content: payload.html,
    byline: payload.byline,
    createdBy: revisionData.lastModifyingUser.displayName,
    sections
  }), (err, html) => {
    if (err) throw err
    cache.add(id, meta.modifiedTime, req.path, html)
    res.end(html)
  })
}

function retrieveDataForPath(path, tree) {
  console.log('in retrieveDataForPath', path)
  const segments = path.split('/').slice(1).filter((s) => s.length)

  console.log(segments)

  let pointer = tree
  let parent = null

  if (segments[0] === 'trash') {
    return [{}, {}]
  }

  // continue traversing down the tree while there are still segements to go
  while ((pointer || {}).nodeType === 'branch' && segments.length) {
    parent = pointer
    pointer = pointer.children[segments.shift()]
  }

  // if we are going to view a directory, switch to the home doc where possible
  if ((pointer || {}).nodeType === 'branch' && pointer.home) {
    pointer = Object.assign({}, pointer, {id: pointer.home, originalId: pointer.id})
  }

  // return the leaf and its immediate branch
  return [pointer || {}, parent]
}

function prepareContextualData(data, url, breadcrumb, parent, slug) {
  const breadcrumbInfo = breadcrumb.map(({id}) => getMeta(id))

  const {children: siblings, id} = parent
  const {children, originalId} = data
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
    parentId: originalId || id, // this seems broken
    parentLinks,
    siblings: siblingLinks,
    children: childrenLinks
  }
}

function createRelatedList(slugs, self, baseUrl) {
  return Object.keys(slugs)
    .filter((slug) => slug !== self)
    .map((slug) => {
      const {id} = slugs[slug]
      const {sort, prettyName, webViewLink, path: url, resourceType, tags} = getMeta(id)
      return {
        sort,
        name: prettyName,
        editLink: webViewLink,
        resourceType,
        url,
        tags
      }
    })
    .filter(({tags}) => !tags.includes('hidden'))
    .sort(sortDocs)
}
