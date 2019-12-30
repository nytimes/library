'use strict'
const {google} = require('googleapis')

const log = require('./logger')
const list = require('./list')
const {getAuth} = require('./auth')
const {sortDocs, stringTemplate} = require('./utils')

const driveId = process.env.DRIVE_ID

/* NB: The move feature is disabled on the front-end as the current cache implementation does
 * not support moving files via the drive API. The move file feature is pending removal as
 * shared drives/folders now support more granular permission to allow users to move files. */

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
  const {parents, slug, path: oldPath} = list.getMeta(id) || {}
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

  const options = driveType === 'folder' ? baseOptions : teamOptions
  await drive.files.update(options)

  if (basePath === '/trash') {
    log.info(`TRASHED ${oldPath}`)
    return '/'
  }

  const newUrl = basePath ? `${basePath}/${slug}` : `/${slug}`

  log.info(`MOVED ${basePath} => ${newUrl}`)

  // TODO: this 404s for 5-10 sec at the moment as the tree must update before the path will map to the correct id
  return newUrl
}

// converts raw tree data used for routing into sorted lists with resource
function extendTree({id, children: keys}) {
  const {prettyName, resourceType, sort, isTrashCan} = list.getMeta(id) || {}

  const children = Object.values(keys || {})
  const extended = children && children.length && !isTrashCan
    ? children.map(extendTree).sort(sortDocs)
    : []

  return Object.assign({}, {id, prettyName, resourceType, sort, isTrashCan}, {children: extended})
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
