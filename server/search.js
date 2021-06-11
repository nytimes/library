'use strict'

const {google} = require('googleapis')
const {getAuth} = require('./auth')
const list = require('./list')
const log = require('./logger')

const driveId = process.env.DRIVE_ID

exports.run = async (query, driveType = 'team') => {
  const authClient = await getAuth()
  const drive = google.drive({version: 'v3', auth: authClient})
  const allFolders = await getAllFolders({drive, driveType})

  const files = await fullSearch({drive, query, allFolders, driveType})
    .catch((err) => {
      log.error(`Error when searching for ${query}, ${err}`)
      throw err
    })

  const fileMetas = files
    .map((file) => { return list.getMeta(file.id) || {} })
    .filter(({path, tags}) => (path || '').split('/')[1] !== 'trash' && !(tags || []).includes('hidden'))

  return fileMetas
}

async function fullSearch({drive, query, allFolders, results = [], nextPageToken: pageToken, driveType}) {
  const options = getOptions(query, allFolders, driveType)

  if (pageToken) {
    options.pageToken = pageToken
  }

  const {data} = await drive.files.list(options)

  let {files, nextPageToken} = data

  if (driveType === 'team') {
    // Filter excluded results for Team Drive here (for folder as root, the filtering is done in the query)
    files = files.filter(shouldIncludeFile(allFolders))
  }
  const total = results.concat(files)

  if (nextPageToken) {
    return fullSearch({drive, query, results: total, nextPageToken, allFolders, driveType})
  }

  return total
}

function shouldIncludeFile(allFolders) {
  // TODO: more efficient implementation
  const includeFile = (file) => {
    if (file.parents.some((parentId) => list.excludeIds.includes(parentId))) {
      log.debug('Excluding ' + file.name)
      return false
    }

    const parentFolders = file.parents.map((parentId) => allFolders.find((folder) => folder.id === parentId)).filter((p) => p)
    return parentFolders.every(includeFile)
  }

  return includeFile
}

// Grab all folders in directory to search through in shared drive
async function getAllFolders({nextPageToken: pageToken, drive, driveType, parentIds = [driveId], foldersSoFar = []} = {}) {
  const options = driveType === 'folder' ? {
    ...list.commonListOptions.folder,
    q: `(${parentIds.map((id) => `'${id}' in parents`).join(' or ')}) AND mimeType = 'application/vnd.google-apps.folder'`,
    fields: 'files(id,name,mimeType,parents)'
  } : {
    ...list.commonListOptions.team,
    q: 'trashed = false AND mimeType = \'application/vnd.google-apps.folder\'',
    // fields: '*', // setting fields to '*' returns all fields but ignores pageSize
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

  if (driveType === 'folder') {
    // When fetching based on a root folder, we need to recurse.
    const folders = combined.filter((item) => parentIds.includes(item.parents[0]))
    if (folders.length > 0) {
      return getAllFolders({
        foldersSoFar: combined,
        drive,
        driveType: 'folder',
        parentIds: folders.map((folder) => folder.id)
      })
    }
  }

  return combined
}

function getOptions(query, allFolders, driveType) {
  const fields = '*'

  if (driveType === 'folder') {
    const parents = allFolders
      .filter((folder) => !list.excludeIds.includes(folder.id))
      .map((id) => `'${id}' in parents`).join(' or ')
    return {
      ...list.commonListOptions.folder,
      q: `(${parents}) AND fullText contains ${JSON.stringify(query)} AND mimeType != 'application/vnd.google-apps.folder' AND trashed = false`,
      fields
    }
  }

  return {
    ...list.commonListOptions.team,
    q: `fullText contains ${JSON.stringify(query)} AND mimeType != 'application/vnd.google-apps.folder' AND trashed = false`,
    fields
  }
}
