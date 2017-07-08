const fs = require('fs')
const google = require('googleapis')
const {getAuth} = require('../../server/auth')

// Run this from root of project as "node test/data/update.js"
// to refresh the contents of supported_formats.html
getAuth((err, auth) => {
  if (err) { return cb(err) }

  const drive = google.drive({version: 'v3', auth: auth})
  drive.files.export({
      fileId: "***REMOVED***",
      mimeType: 'text/html'
    }, (err, html) => {
      fs.writeFileSync('./test/data/supported_formats.html', html, { encoding: 'utf8' })
      console.log('Done.')
    })
})

