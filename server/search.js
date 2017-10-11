'use strict'

const google = require('googleapis')
const {getAuth} = require('./auth')
const list = require('./list')
const teamDriveId = '***REMOVED***'

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

function fullSearch({drive, query, results = [], next}, cb) {
  const options = {
    teamDriveId,
    q: `fullText contains ${JSON.stringify(query)} AND mimeType != 'application/vnd.google-apps.folder' AND trashed = false`,
    corpora: 'teamDrive',
    supportsTeamDrives: true,
    includeTeamDriveItems: true,
    fields: '*'
  }

  if (next) options.pageToken = next

  drive.files.list(options, (err, {files, nextPageToken: next}) => {
    if (err) return cb(err)

    const total = results.concat(files)
    // if there are more results, keep paging
    if (next) {
      return fullSearch({drive, query, results: total, next}, cb)
    }

    cb(null, total)
  })
}
