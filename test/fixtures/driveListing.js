'use strict'

let counter = 1
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
      webViewLink: `https://pretend/google/url/TestFolder${f}`
    }),
    (i, f) => ({
      mimeType: 'application/vnd.google-apps.document',
      name: f <= 1 ? `Test ${i}` : `Home article ${i} for test folder ${f} | home`,
      id: `Test${i}`,
      parents: [ `TestFolder${f}` ],
      createdTime: '2018-04-27T15:19:39.975Z',
      modifiedTime: '2018-04-27T15:25:45.204Z',
      webViewLink: `https://pretend/google/url/Test${i}`,
      lastModifyingUser: {
        kind: 'drive#user',
        displayName: 'Foo Bar',
        me: false
      }
    }),
    (i, f) => ({
      mimeType: 'application/vnd.google-apps.document',
      name: `Test ${i} | hidden`,
      id: `Test${i}`,
      parents: [`TestFolder${f}`],
      webViewLink: `https://pretend/google/url/Test${i}`
    }),
    (i, f) => ({
      mimeType: 'application/vnd.google-apps.document',
      name: `Article 1 in test folder ${f}`,
      id: `Test${i}`,
      parents: [`TestFolder${f}`],
      webViewLink: `https://pretend/google/url/Test${i}`
    }),
    (i, f) => ({
      mimeType: 'application/vnd.google-apps.document',
      name: `Article 2 in test folder ${f} | tagtest`,
      id: `Test${i}`,
      parents: [`TestFolder${f}`],
      webViewLink: `https://pretend/google/url/Test${i}`
    }),
    (i, f) => ({
      mimeType: 'application/vnd.google-apps.spreadsheet',
      name: `Test ${i} | playlist`,
      id: `Test${i}`,
      parents: [`TestFolder${f}`],
      webViewLink: `https://pretend/google/url/Test${i}`
    })
  ].map((fn, i) => {
    return fn(counter + i, counter)
  })

  counter += files.length
  return files
}
