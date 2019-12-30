'use strict'

const {expect} = require('chai')
const {google} = require('googleapis')
const sinon = require('sinon')
const moment = require('moment')

const list = require('../../server/list')
const move = require('../../server/move')
const cache = require('../../server/cache')
const {page1, page2} = require('../fixtures/driveListing')

const folderType = 'application/vnd.google-apps.folder'
const sampleFile = {
  fileId: page1.data.files.find((file) => file.mimeType !== folderType).id,
  destination: page2.data.files.find((file) => file.mimeType === folderType).id,
  html: '<html><h1>Test file </h1></html>'
}

let count = 0
const nextModified = () => {
  count += 1
  return moment(sampleFile.modified).add(count, 'days').format()
}
const updateFile = () => {}

// NB: The move feature is currently disabled - see move.js.
describe('Move files', () => {
  describe('results from getFolders', async () => {
    let folders

    before(async () => {
      folders = await move.getFolders()
    })

    it('should return only folders', () => {
      const onlyFolders = folders[0].children
        .reduce((acc, val) => acc && list.getMeta(val.id).resourceType === 'folder', true)

      expect(onlyFolders).to.be.true // eslint-disable-line no-unused-expressions
    })

    it('should return a single object nested in an array', () => {
      expect(folders).to.be.an('array')
      expect(folders.length).to.equal(1)
      expect(folders[0]).to.be.an('object')
    })

    it('should specify the drive id on the top level', () => {
      expect(folders[0].id).to.equal(process.env.DRIVE_ID)
    })

    it('should specify a prettyName on the top level', () => {
      expect(folders[0].prettyName).to.be.a('string')
    })

    it('should contain children arrays', () => {
      expect(folders[0].children).to.be.an('array')
      expect(folders[0].children[0].children).to.be.an('array')
    })
  })

  describe('moveFile function', () => {
    const {fileId, destination, html} = sampleFile
    let path, newPath, updateSpy, newUrl

    before(async () => {
      const {path: oldPath, slug} = list.getMeta(fileId)
      path = oldPath
      const {path: destPath} = list.getMeta(destination)
      newPath = `${destPath}/${slug}`

      await cache.add(fileId, nextModified(), path, html)
    })

    beforeEach(async () => {
      updateSpy = sinon.spy(updateFile)
      google.drive = () => {
        return {
          files: {
            update: updateSpy
          }
        }
      }
    })

    // in error tests, this will throw "not found", so quiet errors.
    after(() => cache.purge({url: newUrl, modified: nextModified()}).catch(() => {}))

    describe('when not Google authenticated', () => {
      before(() => {
        sinon.stub(google.auth, 'getApplicationDefault').rejects(Error('Auth error'))
      })

      after(() => {
        google.auth.getApplicationDefault.restore()
      })

      it('should return an error', async () => {
        await move.moveFile('test')
          .catch((err) => {
            expect(err).to.exist.and.be.an.instanceOf(Error)
          })
      })
    })

    it('should return an error when the file has no parent folders', async () => {
      const result = await move.moveFile('fakeId', 'fakeDest')
      expect(result).to.exist.and.be.an.instanceOf(Error)
    })

    it('should return an error when the drive id is supplied as the file to move', async () => {
      const result = await move.moveFile(process.env.DRIVE_ID, 'fakeDest')
      expect(result).to.exist.and.be.an.instanceOf(Error)
    })

    describe('in team drive', () => {
      it('should use team drive options with drive api', async () => {
        newUrl = await move.moveFile(fileId, destination, 'team')

        const options = updateSpy.args[0][0]

        expect(options.corpora).to.equal('teamDrive')
        expect(options.teamDriveId).to.equal(process.env.DRIVE_ID)
        expect(options.fileId).to.equal(fileId)
      })
    })

    describe('in shared drive', () => {
      it('should use shared drive options with drive api', async () => {
        newUrl = await move.moveFile(fileId, destination, 'folder')
        const options = updateSpy.args[0][0]

        expect(updateSpy.calledOnce).to.be.true  // eslint-disable-line no-unused-expressions
        expect(options.teamDriveId).to.equal(undefined)
        expect(options.fileId).to.equal(fileId)
      })
    })

    describe('when trashing files', () => {
      before(() => {
        const listStub = sinon.stub(list, 'getMeta')
        listStub.withArgs('trash').returns({path: '/trash'})
        listStub.callThrough()
      })

      after(() => sinon.restore())

      it('should redirect to home', async () => {
        newUrl = await move.moveFile(fileId, 'trash', 'shared')
        expect(newUrl).to.equal('/')
      })
    })

    describe.skip('cache interaction', () => {
      describe('when specified file id has no associated html stored in cache', () => {
        before(() => {
          const getCacheStub = sinon.stub(cache, 'get')
          getCacheStub.callsFake((path) => [{html: null}])
        })
        after(() => sinon.restore())

        it('should redirect to home', async () => {
          newUrl = await move.moveFile(fileId, destination, 'shared')
          expect(newUrl).to.equal('/')
        })
      })

      describe.skip('when cache errors', () => {
        before(async () => {
          await cache.add(fileId, nextModified(), path, html)

          const addToCacheStub = sinon.stub(cache, 'add')
          addToCacheStub.callsFake((id, modified, newurl, html) => {
            return Promise.reject(new Error('Add to cache error'))
          })
        })

        after(() => sinon.restore())

        it('should redirect to home', async () => {
          newUrl = await move.moveFile(fileId, destination, 'shared')
          expect(newUrl).to.equal('/')
        })
      })

      it('should return new url when new path is successfully added to cache', async () => {
        newUrl = await move.moveFile(fileId, destination)

        expect(newUrl).to.equal(newPath)
      })
    })
  })
})
