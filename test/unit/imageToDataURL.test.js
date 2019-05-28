'use strict'

const {assert} = require('chai')
const {imageToDataURL} = require('../../server/utils')

describe('imageToDataURL', () => {
  it('base64-encodes images from the public directory', () => {
    const src = imageToDataURL('/public/images/library.ico')
    const result = src.split(',')[0]
    assert.equal(result, 'data:image/vnd.microsoft.icon;base64')
  })

  it('rewrites filepaths starting with "/assets" to "/public"', () => {
    const src = imageToDataURL('/assets/images/library.ico')
    const result = src.split(',')[0]
    assert.equal(result, 'data:image/vnd.microsoft.icon;base64')
  })

  it('returns the original path when an asset doesn’t exist locally', () => {
    const remoteLogoPath = 'https://my.cdn.com/logo.png'
    const result = imageToDataURL(remoteLogoPath)
    assert.equal(result, remoteLogoPath)
  })
})
