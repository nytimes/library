'use strict'

const {google} = require('googleapis')
const {getAuth} = require('./auth')
const list = require('./list')
const {promisify} = require('util')

const driveType = process.env.DRIVE_TYPE
const driveId = process.env.DRIVE_ID

exports.run = (query, cb) => {
  getAuth((err, authClient) => {
    if (err) {
      return cb(err)
    }
    const drive = google.drive({version: 'v3', auth: authClient})

    fullSearch({drive, query}, (err, files) => {
      if (err) {
        return cb(err)
      }

      const fileMetas = files
        .map((file) => { return list.getMeta(file.id) || {} })
        .filter(({path, tags}) => (path || '').split('/')[1] !== 'trash' && !tags.includes('hidden'))
      cb(null, fileMetas)
    })
  })
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

function getOptions(query, ids) {
  const fields = '*'

  if (driveType === 'shared') {
    const parents = ids.map(id => `'${id}' in parents`).join(' or ')
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

async function fullSearch({drive, query, results = [], next}, cb) {
  // If shared drive, first get ids of all folders to search through
  if (driveType === 'shared') {
    try {
      var parentIds = await getAllFolders({drive})
    } catch(err) {
      log.error(err)
    }
  }

  const options = getOptions(query, parentIds)

  drive.files.list(options, (err, {data: {files, nextPageToken: next}}) => {
    if (err) return cb(err)

    const total = results.concat(files)
    // if there are more results, keep paging
    if (next) {
      return fullSearch({drive, query, results: total, next}, cb)
    }

    cb(null, total)
  })
}
