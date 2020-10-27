'use strict'

const {google} = require('googleapis')
const {getAuth} = require('./auth')
const list = require('./list')
const log = require('./logger')

const driveId = process.env.DRIVE_ID
const MAX_FOLDERS_TO_SEARCH = 100 // got 413 entity too large at 129, this gives us some headroom

exports.run = async (query, driveType = 'team') => {
  const authClient = await getAuth()
  const drive = google.drive({version: 'v3', auth: authClient})

  let folderIdBatches = []

  if (driveType === 'folder') {
    let allFolderIds = await getAllFolders({drive})
    while (allFolderIds.length > 0) {
      folderIdBatches.push(allFolderIds.splice(0, MAX_FOLDERS_TO_SEARCH))
    }

    log.debug(`searching ${allFolderIds.length} folders in chunks of ${MAX_FOLDERS_TO_SEARCH}`)

  }

  if (folderIdBatches.length === 0) {
    folderIdBatches.push([])
  }

  try {
    const files = (await Promise.all(
      folderIdBatches.map((folderIds) =>
        fullSearch({drive, query, folderIds, driveType})
      )
    )).reduce((files, fileBatch) => files.concat(fileBatch), [])

    const fileMetas = files
      .map((file) => { return list.getMeta(file.id) || {} })
      .filter(({path, tags}) => (path || '').split('/')[1] !== 'trash' && !(tags || []).includes('hidden'))

    return fileMetas
  } catch (err) {
    log.error(`Error when searching for ${query}, ${err}`)
    throw err
  }
}

async function fullSearch({drive, query, folderIds, results = [], nextPageToken: pageToken, driveType}) {
  const options = getOptions(query, folderIds, driveType)

  if (pageToken) {
    options.pageToken = pageToken
  }

  const {data} = await drive.files.list(options)

  const {files, nextPageToken} = data
  const total = results.concat(files)

  if (nextPageToken) {
    return fullSearch({drive, query, results: total, nextPageToken, folderIds, driveType})
  }

  return total
}

// Grab all folders in directory to search through in shared drive
async function getAllFolders({nextPageToken: pageToken, drive, parentIds = [driveId], foldersSoFar = []} = {}) {
  const options = {
    q: `(${parentIds.map((id) => `'${id}' in parents`).join(' or ')}) AND mimeType = 'application/vnd.google-apps.folder'`,
    fields: 'files(id,name,mimeType,parents)'
  }

  if (pageToken) {
    options.pageToken = pageToken
  }

  const {data} = await drive.files.list(options)

  const {files, nextPageToken} = data
  const combined = foldersSoFar.concat(files)

  if (nextPageToken) {
    return getAllFolders({
      nextPageToken,
      foldersSoFar: combined,
      drive
    })
  }

  const folders = combined.filter((item) => parentIds.includes(item.parents[0]))

  if (folders.length > 0) {
    return getAllFolders({
      foldersSoFar: combined,
      drive,
      parentIds: folders.map((folder) => folder.id)
    })
  }

  return combined.map((folder) => folder.id)
}

function getOptions(query, folderIds, driveType) {
  const fields = '*'

  if (driveType === 'folder') {
    const parents = folderIds.map((id) => `'${id}' in parents`).join(' or ')
    return {
      q: `(${parents}) AND fullText contains ${JSON.stringify(query)} AND mimeType != 'application/vnd.google-apps.folder' AND trashed = false`,
      fields
    }
  }

  return {
    q: `fullText contains ${JSON.stringify(query)} AND mimeType != 'application/vnd.google-apps.folder' AND trashed = false`,
    teamDriveId: driveId,
    corpora: 'teamDrive',
    supportsTeamDrives: true,
    includeTeamDriveItems: true,
    fields
  }
}
