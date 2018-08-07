'use strict'

const moment = require('moment')

const router = require('express-promise-router')()

const cache = require('../cache')
const log = require('../logger')
const {getTree, getMeta, getPlaylist} = require('../list')
const {handlePlaylist} = require('./playlists')
const {fetchDoc, cleanName, fetchByline} = require('../docs')
const {getTemplates, sortDocs, stringTemplate} = require('../utils')
const {parseUrl} = require('../urlParser')

router.get('*', handleCategory)
module.exports = router

const categories = getTemplates('categories')
async function handleCategory(req, res) {
  log.info(`GET ${req.path}`)
  // TODO: consider putting this in middleware
  const {meta, parent, data} = await parseUrl(req.path)

  if (!meta || !data) return 'next'
  
  const {resourceType, tags, id} = meta
  const {breadcrumb} = data

  const layout = categories.has(root) ? root : 'default'
  const template = `categories/${layout}`

  const parentMeta = getMeta(parent.id)
  if (tags.includes('playlist') || (parentMeta && parentMeta.tags.includes('playlist'))) { 
    return 'next'
  }

  // don't try to fetch branch node
  const contextData = prepareContextualData(data, req.path, breadcrumb, parent, meta.slug)

  const baseRenderData = Object.assign({}, contextData, {
    url: req.path,
    title: meta.prettyName,
    lastUpdatedBy: (meta.lastModifyingUser || {}).displayName,
    modifiedAt: meta.modifiedTime,
    createdAt: moment(meta.createdTime).fromNow(),
    editLink: meta.mimeType === 'text/html' ? meta.folder.webViewLink : meta.webViewLink,
    id,
    template: stringTemplate
  })
  
  // if this is a folder, just render from the generic data
  if (resourceType === 'folder') {
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

async function retrieveDataForPath(path, tree) {
  const segments = path.split('/').slice(1).filter((s) => s.length)

  let pointer = tree
  let parent = null

  if (segments[0] === 'trash') {
    return
  }

  // continue traversing down the tree while there are still segments to go
  while ((pointer || {}).nodeType === 'branch' && segments.length) {
    parent = pointer
    pointer = pointer.children[segments.shift()]
  }

  if (!pointer) return
  
  // if the path points to a file within a playlist
  if (getMeta(pointer.id).tags.includes('playlist') && segments.length === 1) {
    const playlistInfo = await getPlaylist(pointer.id)
    const playlistFileId = playlistInfo.find(fileId => getMeta(fileId).slug === segments[0])

    if (playlistFileId) {
      const {id} = getMeta(playlistFileId)
      const grandparent = parent
      parent = pointer
      pointer = {
        id,
        // generate breadcrumb based on playlist's path
        breadcrumb: parent.breadcrumb.concat({id: parent.id})
      }
    }
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
