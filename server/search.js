'use strict'

const {google} = require('googleapis')
const {getAuth} = require('./auth')
const list = require('./list')
const {promisify} = require('util')

const driveType = process.env.DRIVE_TYPE
const driveId = process.env.DRIVE_ID

exports.run = (query, cb) => {
  getAuth(async (err, authClient) => {
    if (err) {
      return cb(err)
    }
    const drive = google.drive({version: 'v3', auth: authClient})
    
    if (driveType === 'shared') {
      var folderIds = await getAllFolders({drive})
    }
    
    const files = await fullSearch({drive, query, folderIds})
      .catch(err => log.err(`Error when searching for ${query}, ${err}`))

    const fileMetas = files
      .map((file) => { return list.getMeta(file.id) || {} })
      .filter(({path, tags}) => (path || '').split('/')[1] !== 'trash' && !tags.includes('hidden'))
    
    cb(null, fileMetas)
  })
}

async function fullSearch({drive, query, folderIds, results = [], nextPageToken: pageToken}) {
  const options = getOptions(query, folderIds)

  if (pageToken) {
    options.pageToken = pageToken
  }

  const listFiles = promisify(drive.files.list).bind(drive.files)
  const {data} = await listFiles(options)

  const {files, nextPageToken} = data
  const total = results.concat(files)

  if (nextPageToken) {
    return fullSearch({drive, query, results: total, nextPageToken})
  }

  return total
}

// Grab all folders in directory to search through in shared drive
async function getAllFolders({nextPageToken: pageToken, drive, parentIds=[driveId], foldersSoFar=[]} = {}) {
  const options = {
    q: `(${parentIds.map(id => `'${id}' in parents`).join(' or ')}) AND mimeType = 'application/vnd.google-apps.folder'`,
    fields: 'files(id,name,mimeType,parents)'
  }
  
  if (pageToken) {
    options.pageToken = pageToken
  }

  const fetchFolders = promisify(drive.files.list).bind(drive.files)
  const {data} = await fetchFolders(options)

  const {files, nextPageToken} = data
  const combined = foldersSoFar.concat(files)

  if (nextPageToken) {
    return getAllFolders({
      nextPageToken,
      foldersSoFar: combined,
      drive
    })
  }

  const folders = combined.filter(item => parentIds.includes(item.parents[0]))

  if (folders.length > 0) {
    return getAllFolders({
      foldersSoFar: combined,
      drive,
      parentIds: folders.map(folder => folder.id)
    })
  }

  return combined.map(folder => folder.id)
}

function getOptions(query, folderIds) {
  const fields = '*'

  if (driveType === 'shared') {
    const parents = folderIds.map(id => `'${id}' in parents`).join(' or ')
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
