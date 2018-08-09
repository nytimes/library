'use strict'

const router = require('express-promise-router')()

const moment = require('moment')

const {getAuth} = require('../auth')
const log = require('../logger')
const {getMeta, getTree, getPlaylist} = require('../list')
const {fetchDoc, cleanName, fetchByline} = require('../docs')
const {stringTemplate} = require('../utils')
const {parseUrl} = require('../urlParser')

router.get('*', handlePlaylist)
module.exports = router

async function handlePlaylist(req, res) {
  const {meta, parent, data} = await parseUrl(req.path)

  if (!meta || !data) throw new Error('Not found')

  const {resourceType, tags, id} = meta
  const {breadcrumb} = data

  // if the page is a playlist, render playlist overview
  if (tags.includes('playlist')) { //TODO: render with playlist view
    log.info('Getting playlist')
    const playlistIds = await getPlaylist(id)

    // TODO: consolidate/refactor this function
    const playlistOverviewData = preparePlaylistOverview(meta, playlistIds, breadcrumb)

    return res.render(`playlists/default`, playlistOverviewData, (err, html) => {
      if (err) throw err
      res.end(html)
    })
  }

  // if parent is a playlist, render doc in playlist view
  const parentMeta = getMeta(parent.id)
  if (parentMeta && parentMeta.tags.includes('playlist')) {
    log.info('Getting page in playlist')

    // process data
    const {html, originalRevision, sections} = await fetchDoc(id, resourceType, req)
    const revisionData = originalRevision.data
    const payload = fetchByline(html, revisionData.lastModifyingUser.displayName)
    const playlistPageData = await preparePlaylistPage(data, req.path, parent)

    // render as a playlist
    return res.render(`pages/playlists`, Object.assign({}, playlistPageData, { // TODO: prepare data, streamline this handleCategory function
      template: stringTemplate, 
      content: payload.html,
      byline: payload.byline,
      createdBy: revisionData.lastModifyingUser.displayName,
      sections,
      title: meta.prettyName
    }), (err, html) => {
      if (err) throw err
      res.end(html)
    })
  }
}

function preparePlaylistOverview(playlistMeta, values, breadcrumb) {
  const contextData = prepareContextualData(playlistMeta, values, breadcrumb)
  const renderData = Object.assign({}, contextData, {
    template: stringTemplate,
    url: playlistMeta.path,
    title: playlistMeta.prettyName,
    modifiedAt: playlistMeta.modifiedTime,
    lastUpdatedBy: (playlistMeta.lastModifyingUser || {}).displayName,
    createdAt: moment(playlistMeta.createdTime).fromNow(),
    editLink: playlistMeta.mimeType === 'text/html' ? playlistMeta.folder.webViewLink : playlistMeta.webViewLink
  })

  return renderData
}

async function preparePlaylistPage(data, url, parent) {
  const {id, breadcrumb} = data
  const breadcrumbInfo = breadcrumb.map(({id}) => getMeta(id))

  const playlistLinks = await getPlaylist(parent.id, url)
  const basePath = url.split('/').slice(0, -1).join('/')
  const playlistData = playlistLinks.map(id => {
    const {prettyName, slug} = getMeta(id)
    return {
      url: `${basePath}/${slug}`,
      id, 
      prettyName, 
      slug
    }
  })

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

  // get paths for previous and next item in playlist
  const i = playlistLinks.indexOf(id)
  const previous = playlistLinks[i - 1] ? `${basePath}/${getMeta(playlistLinks[i - 1]).slug}` : ''
  const next = playlistLinks[i + 1] ? `${basePath}/${getMeta(playlistLinks[i + 1]).slug}` : ''

  return {
    playlistData,
    parentLinks,
    previous,
    next
  }
}

function prepareContextualData(playlistMeta, values, breadcrumb) {
  const {id, path} = playlistMeta
  const breadcrumbInfo = breadcrumb.map(({id}) => getMeta(id))

  // extend the breadcrumb with render data
  const parentLinks = path
    .split('/')
    .slice(1, -1) // ignore the base empty string and self
    .map((segment, i, arr) => {
      return {
        url: `/${arr.slice(0, i + 1).join('/')}`,
        name: cleanName(breadcrumbInfo[i].name),
        editLink: breadcrumbInfo[i].webViewLink
      }
    })

  const children = values.map(docId => {
    const meta = getMeta(docId)
    return {
      sort: meta.prettyName,
      name: meta.prettyName,
      url: meta.path,
      editLink: meta.mimeType === 'text/html' ? meta.folder.webViewLink : meta.webViewLink,
    }
  })

  return {
    parentId: id,
    children,
    id,
    parentLinks
  }
}

