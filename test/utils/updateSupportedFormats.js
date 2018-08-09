const fs = require('fs')
const {google} = require('googleapis')
const {getAuth} = require('../../server/auth')
require('dotenv').config()

const TEST_FILE_ID = '10o-sZt7kzP-GZDEFrNbfwBy7hFe1toNgEVH2QdQSZ5s'

// Run this from root of project as "node test/utils/updateSupportedFormats.js"
// to refresh the contents of supported_formats.html

async function updateFilesWithAuth(auth, version) {
  if (version === 'v3') {
    const drive = google.drive({version: 'v3', auth: auth})
    const {data} = await drive.files.export({fileId: TEST_FILE_ID, mimeType: 'text/html'})
    fs.writeFileSync('test/fixtures/supportedFormats.html', data, { encoding: 'utf8' })
    console.log('Successfully fetched v3 html export.')
  } else if (version === 'v4') {
    const docs = await google.discoverAPI(`***REMOVED***${process.env.API_KEY}`)
    const {data} = await docs.documents.get({ name: `documents/${TEST_FILE_ID}` })
    const json = JSON.stringify(data)
    fs.writeFileSync('test/fixtures/docv4.json', json, { encoding: 'utf8' })
    console.log('Successfully fetched v4 json payload.')
  } else {
    console.warn(`Unknown API version ${version}`)
  }
}

const updateFiles = () => {
  getAuth().then(async (auth) => {
    await updateFilesWithAuth(auth, 'v3')
    await updateFilesWithAuth(auth, 'v4')
  }).catch((err) => {
    console.log('Err getting auth', err)
  })
}

updateFiles()
