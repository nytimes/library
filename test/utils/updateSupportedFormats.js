const fs = require('fs')
const {google} = require('googleapis')
const {getAuth} = require('../../server/auth')
require('dotenv').config()

const TEST_FILE_ID = '***REMOVED***'

// Run this from root of project as "node test/utils/updateSupportedFormats.js"
// to refresh the contents of supported_formats.html
getAuth((err, auth) => {
  if (err) { return console.log('Failed getting auth!', err) }

  const drive = google.drive({version: 'v3', auth: auth})
  drive.files.export({
    fileId: TEST_FILE_ID,
    mimeType: 'text/html'
  }, (err, { data }) => {
    if (err) { return console.log('Failed fetching v3 file!', err) }
    fs.writeFileSync('test/fixtures/supportedFormats.html', data, { encoding: 'utf8' })
    console.log('Successfully fetched v3 html export.')
  })

  google.discoverAPI(`***REMOVED***${process.env.API_KEY}`).then((docs) => {
    docs.documents.get({ name: `documents/${TEST_FILE_ID}` }, (err, {data}) => {
      if (err) { return console.log('Failed fetching v4 file!', err) }
      const json = JSON.stringify(data)
      fs.writeFileSync('test/fixtures/docv4.json', json, { encoding: 'utf8' })
      console.log('Successfully fetched v4 json payload.')
    })
  })
})
