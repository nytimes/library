'use strict'
const {google} = require('googleapis')
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
    const folders = Object.assign({}, selectFolders(extended), {
      // The drive doesn't have the same props as other folders
      prettyName: 'NYT Library',
      isTrashCan: false
    })
    return cb(null, [folders])
  })
}

exports.moveFile = (id, destination, cb) => {
  const {parents, slug} = getMeta(id) || {}
  const {path: basePath} = getMeta(destination) || {}

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

      const oldUrls = parents.map((id) => {
        const {path} = getMeta(id) || {}
        return path ? `${path}/${slug}` : `/${slug}`
      })

      if (basePath === '/trash') {
        oldUrls.forEach((url) => log.info(`TRASHED ${url}`))
        return cb(null, '/')
      }

      const newUrl = basePath ? `${basePath}/${slug}` : `/${slug}`

      // log that we moved the page(s) to the new url
      oldUrls.forEach((url) => {
        log.info(`MOVED ${url} => ${newUrl}`)
      })

      // fake the drive updating immediately by manually copying cache
      async.parallel(oldUrls.map((url) => {
        return (cb) => {
          cache.get(url, cb)
        }
      }), (err, data) => {
        if (err) return cb(null, '/')

        const hasHtml = data.filter(({html}) => html && html.length)
        if (!hasHtml.length) return cb(null, '/') // take back to the home page

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
  const {prettyName, resourceType, sort, isTrashCan} = getMeta(id) || {}

  const children = Object.values(keys || {})
  const extended = children && children.length && !isTrashCan
    ? children.map(extendTree).sort(sortDocs)
    : []

  return Object.assign({}, {id, prettyName, resourceType, sort, isTrashCan}, { children: extended })
}

function selectFolders({id, prettyName, children, isTrashCan}) {
  const filtered = children
    .filter(isFolder)
    .map(selectFolders)

  return {id, prettyName, children: filtered, isTrashCan}
}

function isFolder({resourceType}) {
  return resourceType && resourceType === 'folder'
}
