'use strict'
const sinon = require('sinon')
const list = require('../../server/list')
const {assert} = require('chai')

describe('categories', () => {
  const sampleChildren = {
    'test-duplicate-title-bug': {
      nodeType: 'leaf',
      prettyName: 'Test Duplicate Title Bug',
      home: undefined,
      homePrettyName: undefined,
      id: '1Mk6PB_kprmtPaQ3UULjTQ4msv24qfo6yOqMBBxYIzuo',
      breadcrumb: [[{}]],
      sort: 'Test Duplicate Title Bug | team'
    }
  }

  afterEach(() => {
    sinon.restore()
  })

  it('should not remove items matching the parent', () => {
    const expected = [
      {
        sort: 'Test Duplicate Title Bug | team',
        name: 'Test Duplicate Title Bug',
        editLink: 'https://docs.google.com/document/d/1Mk6PB_kprmtPaQ3UULjTQ4msv24qfo6yOqMBBxYIzuo/edit?usp=drivesdk',
        resourceType: 'document',
        url: '/test-duplicate-title-bug/test-duplicate-title-bug',
        tags: ['team']
      }
    ]
    sinon.stub(list, 'getMeta').returns({
      id: '1Mk6PB_kprmtPaQ3UULjTQ4msv24qfo6yOqMBBxYIzuo',
      name: 'Test Duplicate Title Bug | team',
      parents: ['1DlHbZAobaiv6IkUP0O6FM6lAvufJZlPT'],
      webViewLink: 'https://docs.google.com/document/d/1Mk6PB_kprmtPaQ3UULjTQ4msv24qfo6yOqMBBxYIzuo/edit?usp=drivesdk',
      prettyName: 'Test Duplicate Title Bug',
      tags: ['team'],
      resourceType: 'document',
      sort: 'Test Duplicate Title Bug | team',
      slug: 'test-duplicate-title-bug',
      folder: {
        id: '1DlHbZAobaiv6IkUP0O6FM6lAvufJZlPT',
        webViewLink: 'https://drive.google.com/drive/folders/1DlHbZAobaiv6IkUP0O6FM6lAvufJZlPT',
        prettyName: 'Test Duplicate Title Bug',
        tags: ['team'],
        resourceType: 'folder',
        sort: 'Test Duplicate Title Bug | team',
        path: '/test-duplicate-title-bug'
      },
      topLevelFolder: {path: '/', tags: []},
      path: '/test-duplicate-title-bug/test-duplicate-title-bug'
    })
    const {createRelatedList} = require('../../server/routes/categories') // we have to import here to populate the local cache
    assert.deepEqual(createRelatedList(sampleChildren), expected)
  })
})
