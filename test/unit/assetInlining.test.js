'use strict'

const {assert} = require('chai')
const {inlineProtectedAsset} = require('../../server/assetInliner')

describe('Asset inlining', () => {
  it('base64-encodes images from the app’s public directory', () => {
    const src = inlineProtectedAsset('/public/images/library.ico')
    const result = src.split(',')[0]
    assert.equal(result, 'data:image/x-icon;base64')
  })

  it('rewrites filepaths starting with "/assets" to "/public"', () => {
    const src = inlineProtectedAsset('/assets/images/library.ico')
    const result = src.split(',')[0]
    assert.equal(result, 'data:image/x-icon;base64')
  })

  it('returns the original path when an asset doesn’t exist locally', () => {
    const remoteLogoPath = 'https://my.cdn.com/logo.png'
    const result = inlineProtectedAsset(remoteLogoPath)
    assert.equal(result, remoteLogoPath)
  })

  it('returns the raw content of a local text file', () => {
    const result = inlineProtectedAsset('/assets/css/inline.css')
    assert.include(result, 'display: block')
  })
})
