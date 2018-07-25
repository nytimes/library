'use strict'

const {expect} = require('chai')
const {google} = require('googleapis')

google.auth.getApplicationDefault = () => {
  return {credential: {JWT: {}}}
}
google.options = () => {}

const docs = require('../../server/docs')

describe('Docs', () => {
  describe('Name Cleaner', () => {
    it('should remove leading numbers and delimeters', () => {
      expect(docs.cleanName('0000123abc12345')).equals('abc12345')
      expect(docs.cleanName('   abc     ')).equals('abc')
      expect(docs.cleanName('123-abc')).equals('abc') // hyphen
      expect(docs.cleanName('123–abc')).equals('abc') // en dash
      expect(docs.cleanName('123—abc')).equals('abc') // em dash
    })

    it('should remove trailing delimeters', () => {
      expect(docs.cleanName('foo | thing')).equals('foo')
      expect(docs.cleanName('one   |      two')).equals('one')
      expect(docs.cleanName('one | two | three')).equals('one | two')
    })

    it('should remove trailing delimeters', () => {
      expect(docs.cleanName('foo | thing')).equals('foo')
      expect(docs.cleanName('one   |      two')).equals('one')
      expect(docs.cleanName('one | two | three')).equals('one | two')
    })

    it('should remove file extensions', () => {
      expect(docs.cleanName('foo.html')).equals('foo')
      expect(docs.cleanName('foo.txt')).equals('foo')
      expect(docs.cleanName('nytimes.com.txt')).equals('nytimes.com')
    })
  })

  describe('Slugification', () => {
    it('should slugify simple phrases', () => {
      expect(docs.slugify('this is a slug')).equals('this-is-a-slug')
      expect(docs.slugify('this-is a slug')).equals('this-is-a-slug')
      expect(docs.slugify('2018 this is a slug')).equals('2018-this-is-a-slug')
    })

    it('should strip spacing', () => {
      expect(docs.slugify('  slugify-  me please ')).equals('slugify-me-please')
    })
  })

  describe('Fetching Byline', () => {
    it('should return reglar byline if none in HTML', () => {
      const {byline} = docs.fetchByline('<p></p>', 'Ben Koski')
      expect(byline).equals('Ben Koski')
    })

    it('should return a byline if present in HTML', () => {
      const {byline} = docs.fetchByline('<p>By John Smith</p>', 'Ben Koski')
      expect(byline).equals('John Smith')
    })

    it('should not return a byline not a real byline', () => {
      const {byline} = docs.fetchByline('<p>I am standing by Port Authority</p>', 'Ben Koski')
      expect(byline).to.not.equals('Port Authority')
      expect(byline).equals('Ben Koski')
    })
  })

  // describe('Fetching Docs', () => {
  //   '1dUMaK6q_EhjwQp9P5NaPfiLY1vJVt4CTz6Gnm9sPPOY'
  //   'document'
  // })
})
