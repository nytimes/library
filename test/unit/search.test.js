'use strict'

const {expect} = require('chai')
let {google} = require('googleapis')
const proxyquire = require('proxyquire').noPreserveCache()
const sinon = require('sinon')

let auth = require('../../server/auth')
let list = require('../../server/list')
let search = require('../../server/search')
const {page1} = require('../fixtures/driveListing')

/* eslint-disable no-unused-expressions */

describe('Search', () => {

  describe('when not authenticated', () => {
    let oldAuth
    before(() => {
      oldAuth = auth.getAuth
      auth.getAuth = function() {
        return new Promise((resolve, reject) => {
          reject(Error('error occured'))
        })
      }
    })

    it('should return an error', async () => {
      const result = await search.run('test')
        .catch((err) => {
          expect(err).to.exist
        })
    })

    after(() => {
      auth.getAuth = oldAuth
    })
  })

  describe('in shared drive', () => {
    before(() => {
      process.env.DRIVE_TYPE = 'shared'

      // reload search.js to use env var
      search = proxyquire('../../server/search', {})
    })

    it('should query for folders, then files', async () => {
      const listFilesSpy = sinon.spy(listZeroFiles)
      google.drive = function sharedDrive() {
        return {
          files: {
            list: listFilesSpy
          }
        }
      }
      
      await search.run('test')
      
      expect(listFilesSpy.calledTwice).to.be.true
      expect(listFilesSpy.args[0][0].q).to.include("mimeType = \'application/vnd.google-apps.folder\'")
      expect(listFilesSpy.args[1][0].q).to.include("mimeType != \'application/vnd.google-apps.folder\'")
    })

    it('should construct a query string with folder parent ids', async () => {
      const listFilesSpy = sinon.spy(listSearchResults)
      google.drive = function sharedDrive() {
        return {
          files: {
            list: listFilesSpy
          }
        }
      }
      const folderIds = onlyFolders(page1).map(obj => obj.id)
      const str = `(${folderIds.map((id) => `'${id}' in parents`).join(' or ')})`

      await search.run('test')
      // expect second call to drive.files to use the ids of the fetched folder ids
      expect(listFilesSpy.calledTwice).to.be.true
      expect(listFilesSpy.args[1][0].q).to.include(str)
    })
  })

  describe('in team drive', () => {

    before(() => {
      process.env.DRIVE_TYPE = 'team'

      search = proxyquire('../../server/search', {})
    })

    it('should search directly for folders', async () => {
      const listFilesSpy = sinon.spy(listZeroFiles)
      google.drive = function sharedDrive() {
        return {
          files: {
            list: listFilesSpy
          }
        }
      }
      
      await search.run('test')

      expect(listFilesSpy.calledOnce).to.be.true
      expect(listFilesSpy.args[0][0].q).to.include("mimeType != \'application/vnd.google-apps.folder\'")
    })
  })

  describe('result handling', () => {
    it('should not show trashed files', async () => {

    })

    it('should not show hidden files')

    it('should throw an error if searching fails')

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
          .filter(obj => obj.mimeType === 'application/vnd.google-apps.folder' && !obj.parents.includes(process.env.DRIVE_ID))
}

function onlyFiles(page) {
  return page.data.files
          .filter(obj => obj.mimeType !== 'application/vnd.google-apps.folder')
}


