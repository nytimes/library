'use strict'

const {google} = require('googleapis')
const router = require('express-promise-router')()
const url = require('url')
const moment = require('moment')

const {getAuth} = require('../auth')
const cache = require('../cache')
const log = require('../logger')
const {getTagged, getMeta, getTree} = require('../list')
const {fetchDoc, cleanName, fetchByline} = require('../docs')
const {getTemplates, sortDocs, stringTemplate} = require('../utils')

router.get('/playlist/:playlistName', handlePlaylist)
module.exports = router

const playlists = getTemplates('playlists')
async function handlePlaylist(req, res) {
  const {playlistName} = req.params

  // fetch playlist with slug specified in params
  const playlists = getTagged('playlist')
  const playlistId = playlists.find(playlistId => getMeta(playlistId).slug === playlistName)
  const playlistMeta = getMeta(playlistId)
  console.log(playlistMeta)

  // get playlist from google spreadsheet using api
  const authClient = await getAuth()
  const sheets = google.sheets({version: 'v4', auth: authClient})
  const response = await sheets.spreadsheets.values.get({spreadsheetId: playlistId, range: 'A1:A100'})

  // prepare breadcrumbs
  const tree = await getTree()
  const [data, parent] = retrieveDataForPath(playlistMeta.path, tree)
  const {id, breadcrumb} = data

  // prepare data to render
  const values = response.data.values.slice(1).map(link => getDocId(link))
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

  res.render(`playlists/default`, renderData, (err, html) => {
    if (err) throw err

    cache.add(playlistId, playlistMeta.modifiedTime, req.path, html)
    res.end(html)
  })
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

function retrieveDataForPath(path, tree) {
  const segments = path.split('/').slice(1).filter((s) => s.length)

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

function getDocId(link) {
  return url.parse(link[0]).pathname.split('/')[3]
}
