'use strict'
const {createRelatedList} = require('../../server/utils')
const {expect} = require('sinon')
describe('categories', () => {
  const sampleChildren = {
    'some-garbage-file-name': {
      nodeType: 'leaf',
      prettyName: 'some garbage file name',
      home: undefined,
      homePrettyName: undefined,
      id: '1vulWBHvBWVDIvXtq-CzDRFQpc4dhLbIcqaQEEuV0-dk',
      breadcrumb: [[{}]],
      sort: 'some garbage file name'
    },
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

  it('should not remove items matching the parent', () => {
    const expected = [
      {
        sort: 'some garbage file name',
        name: 'some garbage file name',
        editLink: 'https://docs.google.com/document/d/1vulWBHvBWVDIvXtq-CzDRFQpc4dhLbIcqaQEEuV0-dk/edit?usp=drivesdk',
        resourceType: 'document',
        url: '/test-duplicate-title-bug/some-garbage-file-name',
        tags: []
      },
      {
        sort: 'Test Duplicate Title Bug | team',
        name: 'Test Duplicate Title Bug',
        editLink: 'https://docs.google.com/document/d/1Mk6PB_kprmtPaQ3UULjTQ4msv24qfo6yOqMBBxYIzuo/edit?usp=drivesdk',
        resourceType: 'document',
        url: '/test-duplicate-title-bug/test-duplicate-title-bug',
        tags: ['team']
      }
    ]
    expect(createRelatedList(sampleChildren)).deepEqual(expected)
  })
})
