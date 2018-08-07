'use strict'
const {google} = require('googleapis')

const log = require('./logger')
const list = require('./list')
const cache = require('./cache')
const {getAuth} = require('./auth')
const {sortDocs, stringTemplate} = require('./utils')

const driveId = process.env.DRIVE_ID

// return the folder html (or at least json object) that can be templated
exports.getFolders = async () => {
  const data = await list.getTree()

  // map to just the data that we need, the ignore the top level drive entry
  const extended = extendTree(data)
  const folders = Object.assign({}, selectFolders(extended), {
    // The drive doesn't have the same props as other folders
    prettyName: stringTemplate('branding.prettyName'),
    isTrashCan: false
  })

  return [folders]
}

exports.moveFile = async (id, destination, driveType = 'team') => {
  const {parents, slug} = list.getMeta(id) || {}
  const {path: basePath} = list.getMeta(destination) || {}

  if (!parents) return Error('Not found')

  const authClient = await getAuth()

  const drive = google.drive({version: 'v3', auth: authClient})

  const baseOptions = {
    fileId: id,
    addParents: [destination],
    removeParents: parents
  }

  const teamOptions = {
    teamDriveId: driveId,
    corpora: 'teamDrive',
    supportsTeamDrives: true,
    includeTeamDriveItems: true,
    ...baseOptions
  }

  const options = driveType === 'shared' ? baseOptions : teamOptions
  await drive.files.update(options)

  const oldUrls = parents.map((id) => {
    const {path} = list.getMeta(id) || {}
    return path ? `${path}/${slug}` : `/${slug}`
  })

  if (basePath === '/trash') {
    oldUrls.forEach((url) => log.info(`TRASHED ${url}`))
    return '/'
  }

  const newUrl = basePath ? `${basePath}/${slug}` : `/${slug}`

  // log that we moved the page(s) to the new url
  oldUrls.forEach((url) => {
    log.info(`MOVED ${url} => ${newUrl}`)
  })

  // fake the drive updating immediately by manually copying cache
  const data = await Promise.all(oldUrls.map((url) => {
    return cache.get(url)
  }))

  // cache stores urls and page data, make sure to find actual data object for page
  const hasHtml = data.filter(({html}) => html && html.length)
  if (!hasHtml.length) return '/'

  const {docId, modified, html} = hasHtml[0]

  const cacheResult = await cache.add(docId, modified, newUrl, html)
  if (cacheResult instanceof Error) return '/'
  return newUrl
}

// converts raw tree data used for routing into sorted lists with resource
function extendTree({id, children: keys}) {
  const {prettyName, resourceType, sort, isTrashCan} = list.getMeta(id) || {}

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
