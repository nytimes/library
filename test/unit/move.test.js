'use strict'

const {expect} = require('chai')
let {google} = require('googleapis')
const proxyquire = require('proxyquire').noPreserveCache()
const sinon = require('sinon')
const moment = require('moment')
const {promisify} = require('util')

let auth = require('../../server/auth')
let list = require('../../server/list')
let move = require('../../server/move')
let cache = require('../../server/cache')
const {page1, page2, page3} = require('../fixtures/driveListing')

const sampleFile = {
  fileId: 'xxxxxhz2Km1y-dFv3AVeUD4fkIdh6syCL8NDV2NxxxxxiTe74',
  destination: 'xxxxxz3-SzaA2bosRlItwcP8GEP5xxxxx3nSxT',
  html: '<html><h1>Test file </h1></html>',
  path: '/article-21-2/article-afia',
  modified: moment(0).format()
}

let count = 0
const nextModified = () => {
  count += 1
  return moment(sampleFile.modified).add(count, 'days').format()
}

/* eslint-disable no-unused-expressions */

describe('Move files', () => {
  describe('results from getFolders', async () => {
    const folders = await move.getFolders()

    it('should return only folders', () => {
      const onlyFolders = folders[0].children
        .reduce((acc, val) => acc && list.getMeta(val.id).resourceType === 'folder', true)

      expect(onlyFolders).to.be.true
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

    // it('should return a children array object for each child', () => {

    // })

  })

  describe('moveFile function', () => {
    let updateSpy, newUrl
    before(() => {
      updateSpy = sinon.spy(updateFile)
      google.drive = () => {
        return {
          files: {
            update: updateSpy
          }
        }
      }
    })

    const {fileId, destination, html, path} = sampleFile
    it('should return an error when file has no parents', async () => {
      const result = await move.moveFile('fakeId', 'fakeDest')
      expect(result).to.exist.and.be.an.instanceOf(Error)
    })

    it('should return an error when the drive id is supplied', async () => {
      const result = await move.moveFile(process.env.DRIVE_ID, 'fakeDest')
      expect(result).to.exist.and.be.an.instanceOf(Error)
    })

    describe('in shared drive', () => {
      before(async () => {
        process.env.DRIVE_TYPE = 'shared'

        // reload move.js to use env var
        move = proxyquire('../../server/move', {})
        
        const addToCache = promisify(cache.add)
        await addToCache(fileId, nextModified(), path, html)
      })

      it('should use shared drive options with update API', async () => {
        const newUrl = await move.moveFile(fileId, destination)
        const options = updateSpy.args[0][0]
        console.log(options)
        
        expect(updateSpy.calledOnce).to.be.true
        expect(options.teamDriveId).to.equal(undefined)
        // expect(options.teamDriveId).to.equal(process.env.DRIVE_ID)
        // expect(options.fileId).to.equal(fileId)
      })
    })

    describe('in team drive', () => {
      before(async () => {
        process.env.DRIVE_TYPE = 'team'

        // reload move.js to use env var
        move = proxyquire('../../server/move', {})
        
        const addToCache = promisify(cache.add)
        await addToCache(fileId, nextModified(), path, html)
      })

      it('should use team drive options with update API', async () => {
        newUrl = await move.moveFile(fileId, destination)
        const options = updateSpy.args[0][0]
        
        expect(updateSpy.calledOnce).to.be.true
        expect(options.corpora).to.equal('teamDrive')
        expect(options.teamDriveId).to.equal(process.env.DRIVE_ID)
        expect(options.fileId).to.equal(fileId)
      })

      after(async () => {
        const purgeCache = promisify(cache.purge)
        await cache.purge({url: newUrl, modified: nextModified()})
      })
    })
  })

})

function updateFile() { return }

//   describe('when not authenticated', () => {
//     let oldAuth
//     before(() => {
//       oldAuth = auth.getAuth
//       auth.getAuth = () => {
//         throw Error('error occured')
//       }
//     })

//     it('should return an error', async () => {
//       const result = await search.run('test')
//         .catch((err) => {
//           expect(err).to.exist
//         })
//     })

//     after(() => {
//       auth.getAuth = oldAuth
//     })
//   })

//   describe('in shared drive', () => {
//     before(() => {
//       process.env.DRIVE_TYPE = 'shared'

//       // reload search.js to use env var
//       search = proxyquire('../../server/search', {})
//     })

//     it('should query for folders, then files', async () => {
//       const listFilesSpy = sinon.spy(listZeroFiles)
//       google.drive = () => {
//         return {
//           files: {
//             list: listFilesSpy
//           }
//         }
//       }
      
//       await search.run('test')
      
//       expect(listFilesSpy.calledTwice).to.be.true
//       expect(listFilesSpy.args[0][0].q).to.include("mimeType = \'application/vnd.google-apps.folder\'")
//       expect(listFilesSpy.args[1][0].q).to.include("mimeType != \'application/vnd.google-apps.folder\'")
//     })

//     it('should construct a query string with folder parent ids', async () => {
//       const listFilesSpy = sinon.spy(listSearchResults)
//       google.drive = () => {
//         return {
//           files: {
//             list: listFilesSpy
//           }
//         }
//       }
//       const folderIds = onlyFolders(page1).map(obj => obj.id)
//       const str = `(${folderIds.map((id) => `'${id}' in parents`).join(' or ')})`

//       await search.run('test')
//       // expect second call to drive.files to use the ids of the fetched folder ids
//       expect(listFilesSpy.calledTwice).to.be.true
//       expect(listFilesSpy.args[1][0].q).to.include(str)
//     })
//   })

//   describe('in team drive', () => {

//     before(() => {
//       process.env.DRIVE_TYPE = 'team'

//       search = proxyquire('../../server/search', {})
//     })

//     it('should search directly for folders', async () => {
//       const listFilesSpy = sinon.spy(listZeroFiles)
//       google.drive = () => {
//         return {
//           files: {
//             list: listFilesSpy
//           }
//         }
//       }
      
//       await search.run('test')

//       expect(listFilesSpy.calledOnce).to.be.true
//       expect(listFilesSpy.args[0][0].q).to.include("mimeType != \'application/vnd.google-apps.folder\'")
//       expect(listFilesSpy.args[0][0].teamDriveId).to.equal(process.env.DRIVE_ID)
//     })
//   })

//   describe('result handling', () => {
//     before(() => {
//       process.env.DRIVE_TYPE = 'team'
//       search = proxyquire('../../server/search', {})

//       google.drive = () => {
//         return {
//           files: {
//             list: listSearchResults
//           }
//         }
//       }
//     })

//     it('should return an array of files', async () => {
//       list.getMeta = fileId => ({id: fileId, path: '/', tags: ['test']})

//       const results = await search.run('test')

//       expect(results).to.be.an('array')
//       expect(results[0]).to.be.an('object')
//       expect(Object.keys(results[0])).to.include('id')
//     })

//     it('should not show trashed files', async () => {
//       list.getMeta = fileId => ({id: fileId, path: '/trash', tags: []})

//       const results = await search.run('test')
//       expect(results).to.be.empty
//     })

//     it('should not show hidden files', async () => {
//       list.getMeta = fileId => ({id: fileId, path: '/', tags: ['hidden']})

//       const results = await search.run('test')
//       expect(results).to.be.empty
//     })

//     it('should produce empty array when no results found', async () => {
//       list.getMeta = fileId => ({id: fileId, path: '/', tags: []})

//       google.drive = () => {
//         return {
//           files: {
//             list: listZeroFiles
//           }
//         }
//       }

//       const results = await search.run('test')
//       expect(results).to.be.empty
//     })

//     it('should throw an error if searching fails', async () => {
//       google.drive = () => {
//         return {
//           files: {
//             list: () => {
//               throw Error('Error occured')
//             }
//           }
//         }
//       }

//       await search.run('test')
//         .catch((err) => {
//           expect(err).to.exist
//         })
//     })
//   })
// })


// function listZeroFiles() {
//   return {data: {files: []}}
// }

// function listSearchResults({pageToken, q}) {
//   if (q.includes("mimeType = 'application/vnd.google-apps.folder'")) {
//     return {data: {files: onlyFolders(page1)}}
//   } 

//   if (q.includes("mimeType != 'application/vnd.google-apps.folder'")) {
//     return {data: {files: onlyFiles(page1)}}
//   }
// }

// function onlyFolders(page) {
//   return page.data.files
//           .filter(obj => obj.mimeType === 'application/vnd.google-apps.folder' && !obj.parents.includes(process.env.DRIVE_ID))
// }

// function onlyFiles(page) {
//   return page.data.files
//           .filter(obj => obj.mimeType !== 'application/vnd.google-apps.folder')
// }
