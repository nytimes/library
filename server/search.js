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

    drive.files.list({
      teamDriveId,
      q: `fullText contains ${JSON.stringify(query)} AND mimeType != 'application/vnd.google-apps.folder' AND trashed = false`,
      corpora: 'teamDrive',
      supportsTeamDrives: true,
      includeTeamDriveItems: true,
      fields: '*'
    }, (err, {files} = {}) => {
      if (err) {
        return cb(err)
      }

      const fileMetas = files.map((file) => { return list.getMeta(file.id) })
      cb(null, fileMetas)
    })
  })
}
