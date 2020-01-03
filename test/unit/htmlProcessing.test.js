const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const {assert} = require('chai')
let {getProcessedDocAttributes} = require('../../server/formatter')

const docPath = path.join(__dirname, '../fixtures/supportedFormats.html')

// helper function to stub the doc and get a section of the returned document
function stubbedProcessedDoc(unprocessedHtml, editorName) {
  const docData = {data: {lastModifyingUser: {displayName: editorName}}}
  return getProcessedDocAttributes([unprocessedHtml, docData])
}

describe('HTML processing', () => {
  before(function () {
    this.rawHTML = fs.readFileSync(docPath, {encoding: 'utf8'})
    this.processedHTML = stubbedProcessedDoc(this.rawHTML).html
    this.output = cheerio.load(this.processedHTML)
  })

  it('strips unnecessary styles', function () {
    const header = this.output('h2')
    assert.equal(null, header.attr('style'))
  })

  it('strips unnecessary &nbsp;s', function () {
    const introHTML = this.output("p:contains('Basic text format')").html()
    assert.match(introHTML, /Text color and highlighting/)
  })

  describe('inline formats', () => {
    it('preserves bolds', function () {
      const boldSpan = this.output("span:contains('bold')").first()
      assert.equal('font-weight:700', boldSpan.attr('style'))
    })

    it('preserves italics', function () {
      const italicSpan = this.output("span:contains('italic')").first()
      assert.equal('font-style:italic', italicSpan.attr('style'))
    })

    it('preserves underlines', function () {
      const underlinedSpan = this.output("span:contains('underline')").first()
      assert.equal('text-decoration:underline', underlinedSpan.attr('style'))
    })

    it('preserves combined formats', function () {
      const combinedSpan = this.output("span:contains('combined')").first()
      assert.equal('font-style:italic;font-weight:700;text-decoration:underline', combinedSpan.attr('style'))
    })

    it('preserves image widths', function () {
      const imageWidth = this.output('img').first()
      const widthMatch = imageWidth.attr('style').match('width')
      assert.isNotNull(widthMatch)
    })
  })

  describe('list handling', () => {
    it('preserves classing on lists', function () {
      const ol = this.output('ol').first()
      assert.match(ol.attr('class'), /lst-/)
    })

    it('presrves the associated style block for lists', function () {
      const olClass = this.output('ol').first().attr('class').split(' ')[0]
      assert.match(this.processedHTML, new RegExp(`ol.${olClass} {`))
    })

    it('applies a level- class on lists to support indentation', function () {
      const topLevelList = this.output("ul:contains('Item 1')").first()
      assert.match(topLevelList.attr('class'), / level-0/)

      const nestedList = this.output("ul:contains('Item 1.1')").first()
      assert.match(nestedList.attr('class'), / level-1/)
    })
  })

  describe('code block handling', () => {
    it('allows &nbsp; as part of a code block', function () {
      const codeBlock = this.output('pre')
      assert.match(codeBlock.html(), /&amp;nbsp/)
    })

    it('preserves whitespace at the start of a line', function () {
      const codeBlock = this.output('pre')
      assert.match(codeBlock.html(), / +jQuery.fn.calcSubWidth/)
    })

    it('scrubs smart quotes', function () {
      const codeBlock = this.output('pre')
      assert.match(codeBlock.html(), /singleQuotedStr = &apos;str&apos;/)
      assert.match(codeBlock.html(), /doubleQuotedStr = &quot;str&quot;/)
    })
  })

  describe('inline code handling', () => {
    describe('with inline code disabled', () => {
      it('does not modify code block content', function () {
        const codeBlock = this.output("pre:contains('codeblocks will not')")
        assert.match(codeBlock.html(), /&lt;%-.*%&gt;/)
      })

      it('does not unescape delimited code', function () {
        const className = this.output("p:contains('.purplePapyrus')")
        const styleTag = className.prev()
        const openingTag = styleTag.prev()

        assert.equal(styleTag.html(), '&lt;style&gt;')
        assert.equal(openingTag.html(), '&lt;%-')
      })
    })

    describe('with inline code enabled', () => {
      before(function () {
        process.env.ALLOW_INLINE_CODE = 'true'
        // remove formatter from require cache to recognize changed env variable
        delete require.cache[require.resolve('../../server/formatter')]
        getProcessedDocAttributes = require('../../server/formatter').getProcessedDocAttributes
        const rawHTML = fs.readFileSync(docPath, {encoding: 'utf8'})
        const processedHTML = stubbedProcessedDoc(rawHTML).html
        this.codeEnabledOut = cheerio.load(processedHTML)
      })

      it('does not modify code block content', function () {
        const codeBlock = this.codeEnabledOut("pre:contains('codeblocks will not')")
        assert.match(codeBlock.html(), /&lt;%-.*%&gt;/)
      })

      it('properly unescapes delimited code', function () {
        const style = this.codeEnabledOut("style:contains('.purplePapyrus')")
        const styledDiv = this.codeEnabledOut('div.purplePapyrus')

        assert.exists(style)
        assert.exists(styledDiv)
        assert.match(style, /font-family: papyrus;/)
        assert.equal(styledDiv.text(), 'But this custom style will!')
      })
    })
  })

  describe('comment handling', () => {
    it('strips comments', function () {
      assert.notMatch(this.processedHTML, /This comment text will not appear/)
    })

    it('strips inline comment anchors', function () {
      const commentAnchorParent = this.output("p:contains('will be stripped from the')")
      assert.notMatch(commentAnchorParent, /\[a\]/)
    })
  })

  describe('byline fetching', () => {
    it('should return reglar byline if none in HTML', () => {
      const {byline} = stubbedProcessedDoc('<p></p>', 'Ben Koski')
      assert.equal(byline, 'Ben Koski')
    })

    it('should return a byline if present in HTML', () => {
      const {byline} = stubbedProcessedDoc('<p>By John Smith</p>', 'Ben Koski')
      assert.equal(byline, 'John Smith')
    })

    it('should return byline override if present in document', () => {
      const {byline} = stubbedProcessedDoc('<p>I am standing by Port Authority</p>', 'Ben Koski')
      assert.notEqual(byline, 'Port Authority')
      assert.equal(byline, 'Ben Koski')
    })
  })
})
