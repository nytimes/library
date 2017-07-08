const fs = require('fs')
const docs = require('../server/docs')
const cheerio = require('cheerio')
const assert = require('chai').assert

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

  it("strips unnecessary &nbsp;s", function() {
    let introHTML = this.output("p:contains('Basic text format')").html()
    assert.match(introHTML, /Text color and highlighting/)
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
      assert.match(ol.attr('class'), /lst-/)
    })

    it("presrves the associated style block for lists", function() {
      let olClass = this.output('ol').first().attr('class').split(' ')[0]
      assert.match(this.processedHTML, new RegExp(`ol.${olClass} \{`))
    })

    it("applies a level- class on lists to support indentation", function() {
      let topLevelList = this.output("ul:contains('Item 1')").first()
      assert.match(topLevelList.attr('class'), / level-0/)

      let nestedList   = this.output("ul:contains('Item 1.1')").first()
      assert.match(nestedList.attr('class'), / level-1/)
    })
  })

  describe("code block handling", function() {
    it("allows &nbsp; as part of a code block", function() {
      let codeBlock = this.output('pre')
      assert.match(codeBlock.html(), /&amp;nbsp/)
    })

    it("preserves whitespace at the start of a line", function() {
      let codeBlock = this.output('pre')
      assert.match(codeBlock.html(), /   if \( \$\(this\)\.find/)
    })

    it("scrubs smart quotes", function() {
      let codeBlock = this.output('pre')
      assert.match(codeBlock.html(), /singleQuotedStr = &apos;str&apos;/)
      assert.match(codeBlock.html(), /doubleQuotedStr = &quot;str&quot;/)
    })
  })

})
