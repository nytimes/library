'use strict'

let counter = 1
let dateCounter = 1500
const driveId = 'b1ae9c8be6c34aa155f157207a0c840e'

module.exports = {
  page1: {
    data: {
      nextPageToken: 'page2',
      files: sampleFiles()
    }
  },
  page2: {
    data: {
      nextPageToken: 'page3',
      files: sampleFiles()
    }
  },
  page3: {
    data: {
      files: sampleFiles()
    }
  }
}

function sampleFiles() {
  const files = [
    (i, f) => ({
      mimeType: 'application/vnd.google-apps.folder',
      name: `Test Folder ${f} | team`,
      id: `TestFolder${f}`,
      parents: [ driveId ],
      webViewLink: `https://pretend/google/url/TestFolder${f}`,
    }),
    (i, f) => ({
      mimeType: 'application/vnd.google-apps.document',
      name: f <= 1 ? `Test ${i}` : `Home article ${i} for test folder ${f} | home`
    }),
    (i, f) => ({
      mimeType: 'application/vnd.google-apps.document',
      name: `Test ${i} | hidden`
    }),
    (i, f) => ({
      mimeType: 'application/vnd.google-apps.document',
      name: `Article 1 in test folder ${f}`
    }),
    (i, f) => ({
      mimeType: 'application/vnd.google-apps.document',
      name: `Article 2 in test folder ${f} | tagtest`
    }),
    (i, f) => ({
      mimeType: 'application/vnd.google-apps.spreadsheet',
      name: `Test ${i} | playlist`
    }),
    (i, f) => ({
      mimeType: 'application/vnd.google-apps.document',
      name: `Article 3 in test folder ${f}`
    }),
    (i, f) => ({
      mimeType: 'application/vnd.google-apps.document',
      name: `Article 3 in test folder ${f}`
    }),
  ].map((fn, i) => {
    const id = counter + i
    const folder = counter
    return {
      ...baseInfo(id, folder),
      ...fn(counter + i, counter)
    }
  })

  counter += files.length
  return files
}

function baseInfo(i, f) {
  return {
    id: `Test${i}`,
    parents: [`TestFolder${f}`],
    webViewLink: `https://pretend/google/url/Test${i}`,
    lastModifyingUser: {
      kind: 'drive#user',
      displayName: 'Foo Bar',
      me: false
    },
    createdTime: getTime(),
    modifiedTime: getTime()
  }
}

function getTime() {
  dateCounter += 1
  return new Date(dateCounter * 10e8).toISOString()
}
