'use strict'

const {google} = require('googleapis')
const router = require('express-promise-router')()
const url = require('url')

const {getAuth} = require('../auth')
const cache = require('../cache')
const log = require('../logger')
const {getTagged, getMeta} = require('../list')
const {fetchDoc, cleanName, fetchByline} = require('../docs')
const {getTemplates, sortDocs, stringTemplate} = require('../utils')

router.get('/playlist/:playlistName', handlePlaylist)
module.exports = router

async function handlePlaylist(req, res) {
  console.log('handling single playlist')
  const {playlistName} = req.params

  // fetch playlist with name specified in params
  const playlists = getTagged('playlist')
  const playlistId = playlists.find(playlistId => getMeta(playlistId).slug === playlistName)
  // const playlistInfo = getMeta(playlistId)

  // read link column using google
  const authClient = await getAuth()
  const sheets = google.sheets({version: 'v4', auth: authClient})
  const response = await sheets.spreadsheets.values.get({spreadsheetId: playlistId, range: 'A1:A100'})

  const values = response.data.values.slice(1).map(link => getDocId(link))

  // similar functionality as categories

  // grab links, map to id
  // list

  // res.render()
}

function getDocId(link) {
  return url.parse(link[0]).pathname.split('/')[3]
}
