'use strict'

const {google} = require('googleapis')
const router = require('express-promise-router')()

const cache = require('../cache')
const log = require('../logger')
const {getTree, getMeta} = require('../list')
const {fetchDoc, cleanName, fetchByline} = require('../docs')
const {getTemplates, sortDocs, stringTemplate} = require('../utils')

router.get('/playlist/:playlistName', handlePlaylist)
module.exports = router

function handlePlaylist(req, res) {
  console.log('handling playlist', req.params)

  // fetch playlist with name specified in params



  // grab links, map to id
  // list

  res.render('<h3>playlist feature in progress</h3>')
}
