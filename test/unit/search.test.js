'use strict'

const {expect} = require('chai')
let {google} = require('googleapis')
const sinon = require('sinon')

const auth = require('../../server/auth')
const list = require('../../server/list')
let search = require('../../server/search')
const {page1} = require('../fixtures/driveListing')

describe('Search', () => {

  // describe('should return an error when not Google authenticated', () => {
  //   let oldAuth, oldDriveList
  //   before(() => {
  //     oldAuth = google.auth.getApplicationDefault
  //   })

  //   it('should return an error', async () => {
  //     google.auth.getApplicationDefault = () => {
  //       console.log('in getApplicationDefault error')
  //       return Error('Auth error')
  //     }
  //     const result = await search.run('test')
  //     console.log(result)
  //       .catch((err) => {
  //         console.log(err)
  //         expect(err).to.exist
  //       })
  //   })

  //   after(() => {
  //     google.auth.getApplicationDefault = oldAuth
  //   })
  // })

  describe('in shared drive', () => {
    it('should query for folders, then files', async () => {
      const listFilesSpy = sinon.spy(listZeroFiles)
      google.drive = () => {
        return {
          files: {
            list: listFilesSpy
          }
        }
      }
      
      await search.run('test', 'shared')
      
      expect(listFilesSpy.calledTwice).to.be.true
      expect(listFilesSpy.args[0][0].q).to.include("mimeType = \'application/vnd.google-apps.folder\'")
      expect(listFilesSpy.args[1][0].q).to.include("mimeType != \'application/vnd.google-apps.folder\'")
    })

    it('should construct a query string with folder parent ids', async () => {
      const listFilesSpy = sinon.spy(listSearchResults)
      google.drive = () => {
        return {
          files: {
            list: listFilesSpy
          }
        }
      }
      const folderIds = onlyFolders(page1).map((obj) => obj.id)
      const str = `(${folderIds.map((id) => `'${id}' in parents`).join(' or ')})`

      await search.run('test', 'shared')
      // expect second call to drive.files to use the ids of the fetched folder ids
      expect(listFilesSpy.calledTwice).to.be.true // eslint-disable-line no-unused-expressions
      expect(listFilesSpy.args[1][0].q).to.include(str)
    })
  })

  describe('in team drive', () => {
    it('should search directly for folders', async () => {
      const listFilesSpy = sinon.spy(listZeroFiles)
      google.drive = () => {
        return {
          files: {
            list: listFilesSpy
          }
        }
      }
      await search.run('test', 'team')

      expect(listFilesSpy.calledOnce).to.be.true // eslint-disable-line no-unused-expressions
      expect(listFilesSpy.args[0][0].q).to.include("mimeType != 'application/vnd.google-apps.folder'")
      expect(listFilesSpy.args[0][0].teamDriveId).to.equal(process.env.DRIVE_ID)
    })
  })

  describe('result handling', () => {
    before(() => {
      google.drive = () => {
        return {
          files: {
            list: listSearchResults
          }
        }
      }
    })

    it('should return an array of files', async () => {
      list.getMeta = fileId => ({id: fileId, path: '/', tags: ['test']})

      const results = await search.run('test')

      expect(results).to.be.an('array')
      expect(results[0]).to.be.an('object')
      expect(Object.keys(results[0])).to.include('id')
    })

    it('should not show trashed files', async () => {
      list.getMeta = (fileId) => ({id: fileId, path: '/trash', tags: []})

      const results = await search.run('test')
      expect(results).to.be.empty // eslint-disable-line no-unused-expressions
    })

    it('should not show hidden files', async () => {
      list.getMeta = (fileId) => ({id: fileId, path: '/', tags: ['hidden']})

      const results = await search.run('test')
      expect(results).to.be.empty // eslint-disable-line no-unused-expressions
    })

    it('should produce empty array when no results found', async () => {
      list.getMeta = (fileId) => ({id: fileId, path: '/', tags: []})

      google.drive = () => {
        return {
          files: {
            list: listZeroFiles
          }
        }
      }

      const results = await search.run('test')
      expect(results).to.be.empty // eslint-disable-line no-unused-expressions
    })

    it('should throw an error if searching fails', async () => {
      google.drive = () => {
        return {
          files: {
            list: () => {
              throw Error('Error occured')
            }
          }
        }
      }

      await search.run('test')
        .catch((err) => {
          expect(err).to.exist // eslint-disable-line no-unused-expressions
        })
    })
  })
})

function listZeroFiles() {
  return {data: {files: []}}
}

function listSearchResults({pageToken, q}) {
  if (q.includes("mimeType = 'application/vnd.google-apps.folder'")) {
    return {data: {files: onlyFolders(page1)}}
  }

  if (q.includes("mimeType != 'application/vnd.google-apps.folder'")) {
    return {data: {files: onlyFiles(page1)}}
  }
}

function onlyFolders(page) {
  return page.data.files
    .filter((obj) => obj.mimeType === 'application/vnd.google-apps.folder' && !obj.parents.includes(process.env.DRIVE_ID))
}

function onlyFiles(page) {
  return page.data.files
    .filter((obj) => obj.mimeType !== 'application/vnd.google-apps.folder')
}
