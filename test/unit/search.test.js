'use strict'

const {expect} = require('chai')
let {google} = require('googleapis')
const proxyquire = require('proxyquire').noPreserveCache()
const sinon = require('sinon')

let auth = require('../../server/auth')
let list = require('../../server/list')
let search = require('../../server/search')
const {page1, page2, page3} = require('../fixtures/driveListing')

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
      // process.env.DRIVE_TYPE = 'shared'

      // // reload search.js to use env var
      search = proxyquire('../../server/search', {})
      //   google: {
      //     drive: function() {
      //       return {
      //         files: {
      //           list: {

      //           }
      //         }
      //       }
      //     }
      //   }
      // })

    })

    it('should query for folders first', async () => {
      const listFilesSpy = sinon.spy(listFiles)
      google.drive = function sharedDrive() {
        return {
          files: {
            list: listFilesSpy
          }
        }
      }
      const results = await search.run('test', 'shared')

      expect(listFilesSpy.args[0][0].q).to.include("application/vnd.google-apps.folder")
    })

    it('should construct a query string with folder parent ids')


    after(() => {
    })
  })

  describe('in team drive', () => {
    it('should search directly for folders')
  })

  describe('result handling', () => {
    it('should not show trashed files')

    it('should not show hidden files')

    it('should throw an error if searching fails')

  })
})


function listFiles({pageToken, ...options}) {
  // if (options.q.includes("mimeType = 'application/vnd.google-apps.folder'")) {
    if (pageToken === 'page2') return {data: {files: onlyFolders(page2), nextPageToken: 'page3'}}
    if (pageToken === 'page3') return {data: {files: onlyFolders(page3)}}
    return {data: {files: onlyFolders(page1), nextPageToken: 'page2'}}
  // } 

  // if (options.q.includes("mimeType != 'application/vnd.google-apps.folder'")) {
  //   if (pageToken === 'page2') return page2
  //   if (pageToken === 'page3') return page3
  //   return page1
  // }
}

function onlyFolders(page) {
  return page.data.files
          .filter(obj => obj.mimeType === 'application/vnd.google-apps.folder' && !obj.parents.includes(process.env.DRIVE_ID))
}



