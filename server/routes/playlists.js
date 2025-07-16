'use strict'

const router = require('express-promise-router')()

const log = require('../logger')
const {getMeta, getPlaylist} = require('../list')
const {fetchDoc} = require('../docs')
const {stringTemplate, formatUrl, pathPrefix} = require('../utils')
const {cleanName} = require('../text')
const {parseUrl} = require('../urlParser')

router.get('*', handlePlaylist)
module.exports = router

async function handlePlaylist(req, res) {
  const {meta, parent, data} = await parseUrl(req.path)

  if (!meta || !data) return 'next'

  const {resourceType, tags, id} = meta
  const {breadcrumb} = data

  // if the page is a playlist, render playlist overview
  if (tags.includes('playlist')) {
    log.info('Getting playlist')
    const playlistIds = await getPlaylist(id)

    // FIXME: consolidate/refactor this function
    const playlistOverviewData = preparePlaylistOverview(meta, playlistIds, breadcrumb)

    return res.render('playlists', playlistOverviewData, (err, html) => {
      if (err) throw err
      res.end(html)
    })
  }

  // if parent is a playlist, render doc in playlist view
  const parentMeta = getMeta(parent.id)
  if (parentMeta && parentMeta.tags.includes('playlist')) {
    log.info('Getting page in playlist')

    // process data
    const {html, byline, createdBy, sections} = await fetchDoc(id, resourceType, req)
    const playlistPageData = await preparePlaylistPage(data, req.path, parentMeta)

    // render as a playlist
    return res.render('playlists/leaf', Object.assign({}, playlistPageData, {
      template: stringTemplate,
      content: html,
      byline: byline,
      createdBy,
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
    createdAt: playlistMeta.createdTime,
    editLink: playlistMeta.mimeType === 'text/html' ? playlistMeta.folder.webViewLink : playlistMeta.webViewLink,
    formatUrl,
    pathPrefix
  })

  return renderData
}

async function preparePlaylistPage(data, url, parent) {
  const {id: currentId, breadcrumb} = data
  const breadcrumbInfo = breadcrumb.map(({id}) => getMeta(id))

  const playlistLinks = await getPlaylist(parent.id, url)
  const basePath = url.split('/').slice(0, -1).join('/')
  const playlistData = playlistLinks.map((id) => {
    const {prettyName, slug, nodeType} = getMeta(id)
    return {
      url: `${basePath}/${slug}`,
      id,
      isCurrent: currentId === id,
      name: prettyName,
      slug,
      nodeType
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
  const defaultNav = {
    url: parent.path,
    name: `Back to ${parent.prettyName}`
  }
  const i = playlistLinks.indexOf(currentId)
  const next = playlistData[i + 1] || defaultNav
  const previous = playlistData[i - 1] || defaultNav

  return {
    siblings: playlistData,
    parentLinks,
    previous,
    next,
    playlistName: parent.prettyName,
    formatUrl,
    pathPrefix
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

  const children = values.map((docId) => {
    const {prettyName, slug, mimeType, folder, webViewLink, resourceType} = getMeta(docId)
    return {
      sort: prettyName,
      name: prettyName,
      url: `${path}/${slug}`,
      editLink: mimeType === 'text/html' ? folder.webViewLink : webViewLink,
      resourceType: resourceType
    }
  })

  return {
    parentId: id,
    children,
    id,
    parentLinks
  }
}
