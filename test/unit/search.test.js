'use strict'

const {expect} = require('chai')
const {google} = require('googleapis')
const sinon = require('sinon')

const list = require('../../server/list')
const search = require('../../server/search')
const {page1} = require('../fixtures/driveListing')

describe('Search', () => {
  describe('when not Google authenticated', () => {
    beforeAll(() => {
      sinon.stub(google.auth, 'getApplicationDefault').returns(Error('Auth error'))
    })

    afterAll(() => {
      google.auth.getApplicationDefault.restore()
    })
    
    it('should return an error', async () => {
      await search.run('test')
        .catch((err) => {
          expect(err).to.exist.and.be.an.instanceOf(Error)
        })
    })
  })

  describe('in shared drive', () => {
    describe('when making first api call to retrieve folders in drive', () => {
      let listFilesSpy
      beforeAll(() => {
        listFilesSpy = sinon.spy(listZeroFiles)
        google.drive = () => {
          return {
            files: {
              list: listFilesSpy
            }
          }
        }
      })

      it('should query for folders', async () => {
        await search.run('test', 'folder')
        const queryString = "mimeType = 'application/vnd.google-apps.folder'"
        expect(listFilesSpy.args[0][0].q).to.include(queryString)
      })
    })

    describe('when making second api call to retrieve search results', () => {
      let listFilesSpy

      beforeAll(async () => {
        listFilesSpy = sinon.spy(listSearchResults)
        google.drive = () => {
          return {
            files: {
              list: listFilesSpy
            }
          }
        }
        await search.run('test', 'folder')
      })

      it('should not query for folders', () => {
        const queryString = "mimeType != 'application/vnd.google-apps.folder'"

        expect(listFilesSpy.args[1][0].q).to.include(queryString)
      })

      it('should construct a query string with folder parent ids', async () => {
        const folderIds = onlyFolders(page1).map((obj) => obj.id)
        const str = `(${folderIds.map((id) => `'${id}' in parents`).join(' or ')})`

        expect(listFilesSpy.args[1][0].q).to.include(str)
      })
    })
  })

  describe('in team drive', () => {
    describe('when querying the drive api', () => {
      let listFilesSpy
      beforeAll(() => {
        listFilesSpy = sinon.spy(listZeroFiles)
        google.drive = () => {
          return {
            files: {
              list: listFilesSpy
            }
          }
        }
      })

      it('should search directly for files', async () => {
        await search.run('test', 'team')

        expect(listFilesSpy.calledOnce).to.be.true // eslint-disable-line no-unused-expressions
        expect(listFilesSpy.args[0][0].q).to.include("mimeType != 'application/vnd.google-apps.folder'")
        expect(listFilesSpy.args[0][0].teamDriveId).to.equal(process.env.DRIVE_ID)
      })
    })
  })

  describe('result handling', () => {
    beforeAll(() => {
      google.drive = () => {
        return {
          files: {
            list: listSearchResults
          }
        }
      }
    })

    it('should return an array of files', async () => {
      list.getMeta = (fileId) => ({id: fileId, path: '/', tags: ['test']})

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

    describe('when no results found', () => {
      beforeAll(() => {
        list.getMeta = (fileId) => ({id: fileId, path: '/', tags: []})
        google.drive = () => {
          return {
            files: {
              list: listZeroFiles
            }
          }
        }
      })

      it('should produce empty array', async () => {
        const results = await search.run('test')
        expect(results).to.be.empty // eslint-disable-line no-unused-expressions
      })
    })

    describe('when the drive api throws an error', () => {
      beforeAll(() => {
        google.drive = () => {
          return {
            files: {
              list: () => {
                throw Error('Error occured')
              }
            }
          }
        }
      })
      it('should propagate through the search call', async () => {
        await search.run('test')
          .catch((err) => {
            expect(err).to.exist // eslint-disable-line no-unused-expressions
          })
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
