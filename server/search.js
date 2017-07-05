'use strict'

const google = require('googleapis')
const {getAuth} = require('./auth')
const teamDriveId = '***REMOVED***'

exports.run = (query, cb) => {

  getAuth((err, authClient) => {
    if (err) {
      return cb(err)
    }
    const drive = google.drive({version: 'v3', auth: authClient})

    drive.files.list({
      teamDriveId,
      q: `fullText contains ${JSON.stringify(query)}`,
      corpora: 'teamDrive',
      supportsTeamDrives: true,
      includeTeamDriveItems: true,
      fields: '*'
    }, (err, {files} = {}) => {
      if (err) {
        return cb(err)
      }

      cb(null, files)
    })
  })

}