const fs = require('fs')
const docs = require('../server/docs')
const cheerio = require('cheerio')
const assert = require('assert')

describe("HTML processing", function() {

  before(function() {
    this.rawHTML = fs.readFileSync('./test/data/supported_formats.html', { encoding: 'utf8' })
    this.processedHTML = docs.processHtml(this.rawHTML)
    this.output = cheerio.load(this.processedHTML)
  })

  it("strips unnecessary styles", function() {
    let header = this.output('h2')
    assert.equal(null, header.attr('style'))
  })

  describe("inline formats", function() {
    it("preserves bolds", function() {
      let boldSpan = this.output("span:contains('bold')").first()
      assert.equal('font-weight:700', boldSpan.attr('style'))
    })

    it("preserves italics", function() {
      let italicSpan = this.output("span:contains('italic')").first()
      assert.equal('font-style:italic', italicSpan.attr('style'))
    })

    it("preserves underlines", function() {
      let underlinedSpan = this.output("span:contains('underline')").first()
      assert.equal('text-decoration:underline', underlinedSpan.attr('style'))
    })

    it("preserves combined formats", function() {
      let combinedSpan = this.output("span:contains('combined')").first()
      assert.equal('font-style:italic;font-weight:700;text-decoration:underline', combinedSpan.attr('style'))
    })
  })

  describe("list handling", function() {
    it("preserves classing on lists", function() {
      let ol = this.output('ol').first()
      assert.ok(/lst-/.test(ol.attr('class')))
    })

    it("presrves the associated style block for lists", function() {
      let olClass = this.output('ol').first().attr('class').split(' ')[0]
      assert.ok(this.processedHTML.match(`ol.${olClass} \{`))
    })

    it("applies a level- class on lists to support indentation", function() {
      let topLevelList = this.output("ul:contains('Item 1')").first()
      assert.ok(topLevelList.attr('class').match(/ level-0/))

      let nestedList   = this.output("ul:contains('Item 1.1')").first()
      assert.ok(nestedList.attr('class').match(/ level-1/))
    })
  })

})
