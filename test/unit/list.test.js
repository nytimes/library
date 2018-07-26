'use strict'

const {expect} = require('chai')

const list = require('../../server/list')

describe('Listing Tree', () => {
  describe('Getting Tree', () => {
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
      expect(children).to.include.keys('top-level-document-1', 'top-level-folder', 'faq')
    })
  })
})
