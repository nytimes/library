'use strict'
const google = require('googleapis')
const async = require('async')

const log = require('./logger')
const {getTree, getMeta} = require('./list')
const cache = require('./cache')
const {getAuth} = require('./auth')
const {sortDocs} = require('./utils')

const teamDriveId = '***REMOVED***'

// return the folder html (or at least json object) that can be templated
exports.getFolders = (id, cb) => {
  getTree((err, data) => {
    if (err) return cb(err)

    // map to just the data that we need, the ignore the top level drive entry
    const extended = extendTree(data)
    const {children: filtered} = selectFolders(extended)
    return cb(null, filtered)
  })
}

exports.moveFile = (id, destination, cb) => {
  const {parents, slug} = getMeta(id) || {}
  const {path: basePath} = getMeta(destination) || {}

  console.log(`id: ${id}, destination: ${destination}`)
  if (!parents) return cb(Error('Not found'))

  getAuth((err, authClient) => {
    if (err) return cb(err)

    const drive = google.drive({version: 'v3', auth: authClient})
    drive.files.update({
      fileId: id,
      addParents: [destination],
      removeParents: parents,
      corpora: 'teamDrive',
      supportsTeamDrives: true,
      includeTeamDriveItems: true,
      teamDriveId
    }, (err, result) => {
      if (err) return cb(err)

      if (basePath === '/trash') {
        return cb(null, '/')
      }

      const newUrl = `${basePath}/${slug}`
      const oldUrls = parents.map((id) => {
        const {path} = getMeta(id)
        return `${path}/${slug}`
      })

      // fake the drive updating immediately by manually copying cache
      async.parallel(oldUrls.map((url) => {
        return (cb) => {
          cache.get(url, cb)
        }
      }), (err, data) => {
        if (err) return cb(null, '/')

        const hasHtml = data.filter(({html}) => html && html.length)
        if (!hasHtml) return cb(null, '/') // take back to the home page

        const {id, modified, html} = hasHtml[0]
        cache.add(id, modified, newUrl, html, (err) => {
          if (err) {
            log.error(err)
            return cb(null, '/')
          }

          return cb(null, newUrl)
        })
      })
    })
  })
}

// converts raw tree data used for routing into sorted lists with resource
function extendTree({id, children: keys}) {
  const {prettyName, resourceType, sort} = getMeta(id) || {}

  const children = Object.values(keys || {})
  const extended = children && children.length
    ? children.map(extendTree).sort(sortDocs)
    : []

  return Object.assign({}, {id, prettyName, resourceType, sort}, { children: extended })
}

function selectFolders({id, prettyName, children}) {
  const filtered = children
    .filter(isFolder)
    .map(selectFolders)

  return {id, prettyName, children: filtered}
}

function isFolder({resourceType}) {
  return resourceType && resourceType === 'folder'
}
