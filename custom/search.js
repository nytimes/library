'use strict'

const {google} = require('googleapis')
const {getAuth} = require('../server/auth')
const list = require('../server/list')
const log = require('../server/logger')

const driveId = process.env.DRIVE_ID

exports.run = async (query, driveType = 'team') => {
  const authClient = await getAuth()
  let folderIds

  const drive = google.drive({version: 'v3', auth: authClient})

  if (driveType === 'folder') {
    folderIds = await getAllFolders({drive})
  }

  const excludedFolders = await getExcludedFolders(drive)

  const files = await fullSearch({drive, query, folderIds, driveType, excludedFolders})
    .catch((err) => {
      log.error(`Error when searching for ${query}, ${err}`)
      throw err
    })

  const fileMetas = files
    .map((file) => { return list.getMeta(file.id) || {} })
    .filter(({path, tags}) => (path || '').split('/')[1] !== 'trash' && !(tags || []).includes('hidden'))

  return fileMetas
}

async function fullSearch({drive, query, folderIds, results = [], nextPageToken: pageToken, driveType, excludedFolders}) {
  const options = getOptions(query, folderIds, driveType, excludedFolders)

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
    ...list.commonListOptions.folder,
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

function getOptions(query, folderIds, driveType, excludedFolders) {
  const fields = '*'

  if (driveType === 'folder') {
    const parents = folderIds.map((id) => `'${id}' in parents`).join(' or ')
    return {
      ...list.commonListOptions.folder,
      q: `(${parents}) AND fullText contains ${JSON.stringify(query)} AND mimeType != 'application/vnd.google-apps.folder' AND trashed = false`,
      fields
    }
  }

  // Filter ignored folders from search
  let excludeFolderQuery = ''
  if (Array.isArray(excludedFolders)) {
    excludeFolderQuery = excludedFolders.map((folder) => `AND NOT '${folder}' in parents`).join(' ')
  }

  return {
    ...list.commonListOptions.team,
    q: `fullText contains ${JSON.stringify(query)} AND mimeType != 'application/vnd.google-apps.folder' ${excludeFolderQuery} AND trashed = false`,
    teamDriveId: driveId,
    fields
  }
}

// Gets excluded folders and subfolders. The parent excluded folder(s) come from
// the environment variable EXCLUDE_FOLDERS. It is assumed that the environment variable
// will have comma delimited Google Drive Folder Ids.
// Example:
//   EXCLUDE_FOLDERS=1eg1nvVmfER1_824VPO2WzOG2EXXTwE0l,179O1Oq8pkD69D_hJKe2BxTvHanp9HGM
async function getExcludedFolders(drive) {
  const ignoredFolders = process.env.EXCLUDE_FOLDERS

  if (!ignoredFolders) {
    return []
  }

  const folders = ignoredFolders.split(',')
  const subfolders = folders.map(async (folder) => await getAllFolders({drive, parentIds: [folder]}))
  const result = await Promise.all(subfolders)

  return [...folders, ...result.flat()]
}
