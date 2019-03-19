'use strict'

const fs = require('fs')
const {google} = require('googleapis')
const {getAuth} = require('../../server/auth')
require('dotenv').config()

const TEST_FILE_ID = '12bUE9b4_aF_IfhxCLdHApN8KKXwa4gQUCGkHzt1FyRI'

// Run this from root of project as "node test/utils/updateSupportedFormats.js"
// to refresh the contents of supported_formats.html
async function updateSupportedFormats() {
  const auth = await getAuth()

  const drive = google.drive({version: 'v3', auth: auth})
  drive.files.export({
    fileId: TEST_FILE_ID,
    mimeType: 'text/html'
  }, (err, { data }) => {
    if (err) { return console.log('Failed fetching v3 file!', err) }
    fs.writeFileSync('test/fixtures/supportedFormats.html', data, { encoding: 'utf8' })
    console.log('Successfully fetched v3 html export.')
  })
}

updateSupportedFormats()
