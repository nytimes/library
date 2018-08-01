'use strict'

const {google} = require('googleapis')
const router = require('express-promise-router')()
const url = require('url')
const moment = require('moment')

const {getAuth} = require('../auth')
const cache = require('../cache')
const log = require('../logger')
const {getTagged, getMeta} = require('../list')
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

  // get playlist from google spreadsheet using api
  const authClient = await getAuth()
  const sheets = google.sheets({version: 'v4', auth: authClient})
  const response = await sheets.spreadsheets.values.get({spreadsheetId: playlistId, range: 'A1:A100'})

  // prepare data to render
  const values = response.data.values.slice(1).map(link => getDocId(link))
  const contextData = prepareContextualData(playlistMeta, values)

  const renderData = Object.assign({}, contextData, {
    parentLinks: [{url: '/playlists', name: 'Playlists'}],
    template: stringTemplate,
    url: playlistMeta.path,
    title: playlistMeta.prettyName,
    modifiedAt: playlistMeta.modifiedTime,
    lastUpdatedBy: (playlistMeta.lastModifyingUser || {}).displayName,
    createdAt: moment(playlistMeta.createdTime).fromNow(),
    // editLink: mimeType === 'text/html' ? playlistMeta.folder.webViewLink : playlistMeta.webViewLink
  })

  res.render(`playlists/default`, renderData, (err, html) => {
    if (err) throw err

    cache.add(playlistId, playlistMeta.modifiedTime, req.path, html)
    res.end(html)
  })
}

function prepareContextualData(playlistMeta, values) {
  const children = values.map(docId => {
    const meta = getMeta(docId)
    return {
      sort: meta.prettyName,
      name: meta.prettyName,
      url: meta.path,
      editLink: meta.mimeType === 'text/html' ? meta.folder.webViewLink : meta.webViewLink,
      // id,
    }
  })

  return {
    parentId: playlistMeta.id,
    children
  }

}

function getDocId(link) {
  return url.parse(link[0]).pathname.split('/')[3]
}
