'use strict'

const {expect} = require('chai')

const list = require('../../server/list')

describe('Tree', () => {
  it('should successfully be able to fetch a tree', async () => {
    const tree = await list.getTree()
    expect(tree.children).to.exist // eslint-disable-line no-unused-expressions
  })

  it('should contain top level items', async () => {
    const tree = await list.getTree()
    expect(tree).to.include.keys(
      'breadcrumb', 'children', 'home', 'id', 'nodeType', 'sort'
    )
  })

  it('should have top level children', async () => {
    const {children} = await list.getTree()
    expect(children).to.include.keys('top-level-document-1', 'top-level-folder', 'test-folder')
  })

  it('should correctly parse tags', () => {
    expect(list.getTagged('home')).to.include('174d31f319c2787f5e42e4d0eed83fe7')
    expect(list.getTagged('hidden')).to.include('0d6c4b7036c9e852996ac5c23239e9a3')
  })

  it('should correctly report children', () => {
    const {children} = list.getChildren('f2f9987da7aef80de3733bbe882e6b1e')
    expect(children.length).to.equal(6)
    expect(children).to.include(
      '981cd74318b6350f8054319c8d0d0a92',
      '1872a6e4df263f9bb9c1004c3bda1530',
      '38a019f9ec84049959ee617a04298c0b',
      '70a03c7ef29818a00645afe981369c5c',
      'da5a966305a1272dde641f28f73b0e13',
      '1a25f79c96a4f06f102af0d3ae774896'
    )
  })

  it('should be able to fetch all routes', () => {
    const routes = list.getAllRoutes()
    expect(routes).to.exist // eslint-disable-line no-unused-expressions
    expect(routes).to.not.be.empty // eslint-disable-line no-unused-expressions
  })
})
