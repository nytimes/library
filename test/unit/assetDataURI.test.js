'use strict'

const {assert} = require('chai')
const {assetDataURI} = require('../../server/utils')

describe('assetDataURI', () => {
  // depending on filesystem, assets will be vnd.microsoft or x-icons.
  it('base64-encodes images from the public directory', async () => {
    const src = await assetDataURI('/public/images/library.ico')
    const result = src.split(',')[0]
    assert.match(result, /data:image\/(vnd\.microsoft\.|x-)icon;base64/)
  })

  it('rewrites filepaths starting with "/assets" to "/public"', async () => {
    const src = await assetDataURI('/assets/images/library.ico')
    const result = src.split(',')[0]
    assert.match(result, /data:image\/(vnd\.microsoft\.|x-)icon;base64/)
  })

  it('throws an error when the file does not exist locally', (done) => {
    const remoteLogoPath = 'https://my.cdn.com/logo.png'
    assetDataURI(remoteLogoPath).catch((err) => {
      assert.equal(err.code, 'ENOENT')
      done()
    })
  })
})
