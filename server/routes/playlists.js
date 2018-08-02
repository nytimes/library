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

exports.handlePlaylist = function(playlistMeta, values, breadcrumb) {
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
