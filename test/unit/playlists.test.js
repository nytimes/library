'use strict'

const {expect} = require('chai')
let {google} = require('googleapis')
const sinon = require('sinon')
const validUrl = require('valid-url')

const {getPlaylist, getTree, getMeta} = require('../../server/list')

/* eslint-disable no-unused-expressions */

describe('Playlists', () => {
  describe('getPlaylist() in list.js', () => {
    describe('when not Google authenticated', () => {
      beforeAll(() => {
        sinon.stub(google.auth, 'getApplicationDefault').rejects(Error('Auth error'))
      })

      afterAll(() => {
        google.auth.getApplicationDefault.restore()
      })

      it('should throw an error', async () => {
        await getPlaylist('test')
          .catch((err) => {
            expect(err).to.exist.and.be.an.instanceOf(Error)
          })
      })
    })

    describe('when fetching a second time', () => {
      let sheetsSpy, playlistInfo
      beforeAll(async () => {
        sheetsSpy = sinon.spy(google, 'sheets')
        playlistInfo = await getPlaylist('testId')
      })

      afterAll(async () => {
        sheetsSpy.restore()
      })

      it('should retrieve playlist from memory if already added', async () => {
        const secondFetch = await getPlaylist('testId')

        expect(sheetsSpy.callCount).to.equal(1)
        expect(secondFetch).to.equal(playlistInfo)
      })
    })

    describe('when adding data to local memory object playlistInfo', () => {
      let playlistInfo
      beforeAll(async () => {
        playlistInfo = await getPlaylist('firstId')
        await getTree()
      })

      it('should convert webview urls to ids', () => {
        const urls = playlistInfo.filter(doc => validUrl.isUri(doc))

        expect(urls).to.be.empty
      })

      it('should set playlistInfo without manipulating the existing values', async () => {
        const secondPlaylist = await getPlaylist('secondId')
        const firstPlaylist = await getPlaylist('firstId')

        expect(firstPlaylist).to.exist
        expect(firstPlaylist).to.equal(playlistInfo)
      })
    })
    
    describe('when Google spreadsheet fetch fails', () => {
      let oldSheet
      beforeAll(() => {
        oldSheet = google.sheets
        google.sheets = () => {
          return {
            spreadsheets: {
              values: {
                get: () => {
                  return {
                    data: { values: () => Promise.reject(Error('Spreadsheet error'))}
                  }
                }
              }
            }
          }
        }
      })

      afterAll(() => {
        google.sheets = oldSheet
      })

      it('should throw an error', async () => {
        await getPlaylist('failingId')
          .catch(err => {
            expect(err).to.exist.and.be.an.instanceOf(Error)
          })
      })
    })
  })
})
