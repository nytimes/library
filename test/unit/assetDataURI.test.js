'use strict'

const {assert} = require('chai')
const {assetDataURI} = require('../../server/utils')

describe('assetDataURI', () => {
  it('base64-encodes images from the public directory', async function() {
    const src = await assetDataURI('/public/images/library.ico')
    const result = src.split(',')[0]
    assert.equal(result, 'data:image/vnd.microsoft.icon;base64')
  })

  it('rewrites filepaths starting with "/assets" to "/public"', async function() {
    const src = await assetDataURI('/assets/images/library.ico')
    const result = src.split(',')[0]
    assert.equal(result, 'data:image/vnd.microsoft.icon;base64')
  })

  it('throws an error when the file does not exist locally', function(done) {
    const remoteLogoPath = 'https://my.cdn.com/logo.png'
    assetDataURI(remoteLogoPath).catch(err => {
      assert.equal(err.code, 'ENOENT');
      done()
    })
  })
})
