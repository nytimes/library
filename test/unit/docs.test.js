'use strict'

const {expect} = require('chai')

const {cleanName, slugify, fetchDoc} = require('../../server/docs')

const PAYLOAD_KEYS = ['html', 'byline', 'createdBy', 'sections']

describe('Docs', () => {
  describe('Name Cleaner', () => {
    it('should remove leading numbers and delimeters', () => {
      expect(cleanName('0000123abc12345')).equals('abc12345')
      expect(cleanName('   abc     ')).equals('abc')
      expect(cleanName('123-abc')).equals('abc') // hyphen
      expect(cleanName('123–abc')).equals('abc') // en dash
      expect(cleanName('123—abc')).equals('abc') // em dash
    })

    it('should remove trailing delimeters', () => {
      expect(cleanName('foo | thing')).equals('foo')
      expect(cleanName('one   |      two')).equals('one')
      expect(cleanName('one | two | three')).equals('one | two')
    })

    it('should remove file extensions', () => {
      expect(cleanName('foo.html')).equals('foo')
      expect(cleanName('foo.txt')).equals('foo')
      expect(cleanName('nytimes.com.txt')).equals('nytimes.com')
    })

    it('should not remove numbers when no text in the document name', () => {
      expect(cleanName('2018')).equals('2018')
      expect(cleanName('3/28')).equals('3/28')
      expect(cleanName('3-28-2018')).equals('3-28-2018')
    })
  })

  describe('Slugification', () => {
    it('should slugify simple phrases', () => {
      expect(slugify('this is a slug')).equals('this-is-a-slug')
      expect(slugify(' this   is a     slug   ')).equals('this-is-a-slug')
      expect(slugify('this-is a slug')).equals('this-is-a-slug')
      expect(slugify('this... is a slug!')).equals('this-is-a-slug')
      expect(slugify('2018 this is a slug')).equals('2018-this-is-a-slug')
    })

    it('should strip spacing', () => {
      expect(slugify('  slugify-  me please ')).equals('slugify-me-please')
    })
  })

  describe('Fetching Docs', () => {
    it('should fetch document data with expected structure', async () => {
      const doc = await fetchDoc('id-doc', 'document', {})
      expect(doc).to.include.keys('html', 'byline', 'createdBy', 'sections')
    })

    // no longer cas originalrevision data
    it.skip('should return revision data with correct format', async () => {
      const {originalRevision} = await fetchDoc('id-doc', 'document', {})
      expect(originalRevision.data).to.have.keys('kind', 'mimeType', 'modifiedTime', 'published', 'lastModifyingUser')
    })

    it.skip('should have correct mimetype for document', async () => {
      const {originalRevision} = await fetchDoc('id-doc', 'document', {})
      const {mimeType} = originalRevision.data
      expect(mimeType).equals('application/vnd.google-apps.document')
    })

    it('should parse sections correctly', async () => {
      const doc = await fetchDoc('mulitsection', 'document', {})
      expect(doc).to.include.keys('html', 'sections')
      const {sections} = doc
      expect(sections.length).equals(2)
      expect(sections[0].subsections.length).equals(3)
    })
  })

  describe('Fetching Sheets', () => {
    it('should fetch sheet data with expected structure', async () => {
      const sheet = await fetchDoc('id-sheet', 'spreadsheet', {})
      expect(sheet).to.include.keys(PAYLOAD_KEYS)
    })

    // no longer includes revision data
    it.skip('should return revision data with correct format', async () => {
      const {originalRevision} = await fetchDoc('id-sheet', 'spreadsheet', {})
      expect(originalRevision.data).to.have.keys('kind', 'mimeType', 'modifiedTime', 'published', 'lastModifyingUser')
    })

    it('should successully parse the sheet to a html table', async () => {
      const {html} = await fetchDoc('id-sheet', 'spreadsheet', {})
      expect(html).includes('<table>')
      expect(html).includes('</table>')
    })
  })

  describe('Fetching html', () => {
    it('should fetch html data with expected structure', async () => {
      const sheet = await fetchDoc('id-html', 'text/html', {})
      expect(sheet).to.include.keys(PAYLOAD_KEYS)
    })

    it('should not modify html', async () => {
      const {html} = await fetchDoc('id-html', 'text/html', {})
      expect(html).equals('<h1>This is a raw HTML document</h1>')
    })
  })

  it('should identify bad resource types', async () => {
    const {html} = await fetchDoc('id-html', 'badtype', {})
    expect(html).equals('Library does not support viewing badtypes yet.')
  })
})
