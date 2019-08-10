'use strict'

const {expect} = require('chai')

const list = require('../../server/list')
const {allFilenames} = require('../utils')

describe('Tree', () => {
  it('should successfully be able to fetch a tree', async () => {
    const tree = await list.getTree()
    expect(tree.children).to.exist // eslint-disable-line no-unused-expressions
  })

  it('should contain top level items', async () => {
    const tree = await list.getTree()
    expect(tree).to.include.keys(
      'breadcrumb', 'children', 'home', 'id', 'nodeType', 'sort', 'prettyName'
    )
  })

  it('should have top level children', async () => {
    const {children} = await list.getTree()
    expect(children).to.include.keys('test-folder-1', 'test-folder-7', 'test-folder-13')
  })

  it('should correctly parse tags', () => {
    expect(list.getTagged('home')).to.include('Test8')
    expect(list.getTagged('hidden')).to.include('Test15')
  })

  it('should correctly report children', () => {
    const {children} = list.getChildren('TestFolder7')
    expect(children.length).to.equal(4)
    expect(children).to.include(
      'Test9',
      'Test10',
      'Test11',
      'Test12'
    )
  })

  it('should be able to fetch all routes', () => {
    const routes = list.getAllRoutes()
    expect(routes).to.exist // eslint-disable-line no-unused-expressions
    expect(routes).to.not.be.empty // eslint-disable-line no-unused-expressions
  })
})

describe('Filename Listing', () => {
  it('should successfully be able to fetch filenames', async () => {
    const filenames = await list.getFilenames()
    expect(filenames).to.exist // eslint-disable-line no-unused-expressions
  })

  it('should contain all filenames in drive', async () => {
    const filenames = await list.getFilenames()
    expect(filenames).to.include(...allFilenames)
  })
})
