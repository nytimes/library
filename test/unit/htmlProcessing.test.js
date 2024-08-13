const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const {assert} = require('chai')
let {getProcessedDocAttributes} = require('../../server/formatter')

const docPath = path.join(__dirname, '../fixtures/supportedFormats.html')
const docPathNativeCode = path.join(__dirname, '../fixtures/supportedFormats.nativeCode.html')

// helper function to stub the doc and get a section of the returned document
function stubbedProcessedDoc(unprocessedHtml, editorName) {
  const docData = {data: {lastModifyingUser: {displayName: editorName}}}
  return getProcessedDocAttributes([unprocessedHtml, docData])
}

describe('HTML processing', () => {
  const testGlobal = {}

  beforeAll(() => {
    // General supported formats
    testGlobal.general = {}
    testGlobal.general.rawHTML = fs.readFileSync(docPath, {encoding: 'utf8'})
    testGlobal.general.processedHTML = stubbedProcessedDoc(testGlobal.general.rawHTML).html
    testGlobal.general.output = cheerio.load(testGlobal.general.processedHTML)

    // Native code
    testGlobal.native = {}
    testGlobal.native.rawHTML = fs.readFileSync(docPathNativeCode, {encoding: 'utf8'})
    testGlobal.native.processedHTML = stubbedProcessedDoc(testGlobal.native.rawHTML).html
    testGlobal.native.output = cheerio.load(testGlobal.native.processedHTML)

    // Supported formats with inline code enabled
    jest.resetModules()
    process.env.ALLOW_INLINE_CODE = 'true'
    // remove formatter from require cache to recognize changed env variable
    delete require.cache[require.resolve('../../server/formatter')]
    getProcessedDocAttributes = require('../../server/formatter').getProcessedDocAttributes

    testGlobal.inlineCode = {}
    testGlobal.inlineCode.rawHTML = fs.readFileSync(docPath, {encoding: 'utf8'})
    testGlobal.inlineCode.processedHTML = stubbedProcessedDoc(testGlobal.inlineCode.rawHTML).html
    testGlobal.inlineCode.output = cheerio.load(testGlobal.inlineCode.processedHTML)
  })

  it('does not throw when revision data is unavailable', () => {
    const processed = getProcessedDocAttributes('<h1>Hello</h1>', null)
    assert(processed)
  })

  it('strips unnecessary styles', () => {
    const header = testGlobal.general.output('h2')
    assert.equal(null, header.attr('style'))
  })

  it('strips unnecessary &nbsp;s', () => {
    const introHTML = testGlobal.general.output("p:contains('Basic text format')").html()
    assert.match(introHTML, /Text color and highlighting/)
  })

  describe('inline formats', () => {
    it('preserves bolds', () => {
      const boldSpan = testGlobal.general.output("span:contains('bold')").first()
      assert.equal('font-weight:700', boldSpan.attr('style'))
    })

    it('preserves italics', () => {
      const italicSpan = testGlobal.general.output("span:contains('italic')").first()
      assert.equal('font-style:italic', italicSpan.attr('style'))
    })

    it('preserves underlines', () => {
      const underlinedSpan = testGlobal.general.output("span:contains('underline')").first()
      assert.equal('text-decoration:underline', underlinedSpan.attr('style'))
    })

    it('preserves combined formats', () => {
      const combinedSpan = testGlobal.general.output("span:contains('combined')").first()
      assert.equal('font-style:italic;font-weight:700;text-decoration:underline', combinedSpan.attr('style'))
    })

    it('preserves image widths', () => {
      const imageWidth = testGlobal.general.output('img').first()
      const widthMatch = imageWidth.attr('style').match('width')
      assert.isNotNull(widthMatch)
    })
  })

  describe('list handling', () => {
    it('preserves classing on lists', () => {
      const ol = testGlobal.general.output('ol').first()
      assert.match(ol.attr('class'), /lst-/)
    })

    it('presrves the associated style block for lists', () => {
      const olClass = testGlobal.general.output('ol').first().attr('class').split(' ')[0]
      assert.match(testGlobal.general.processedHTML, new RegExp(`ol.${olClass} {`))
    })

    it('applies a level- class on lists to support indentation', () => {
      const topLevelList = testGlobal.general.output("ul:contains('Item 1')").first()
      assert.match(topLevelList.attr('class'), / level-0/)

      const nestedList = testGlobal.general.output("ul:contains('Item 1.1')").first()
      assert.match(nestedList.attr('class'), / level-1/)
    })
  })

  describe('code block handling', () => {
    it('highlights registered languages', () => {
      const codeBlock = testGlobal.general.output('pre > code[data-lang="javascript"]')
      assert.exists(codeBlock.html())
    })

    it('allows &nbsp; as part of a code block', () => {
      const codeBlock = testGlobal.general.output('pre > code[data-lang="javascript"]')
      assert.match(codeBlock.html(), /&amp;nbsp/)
    })

    it('preserves whitespace at the start of a line', () => {
      const codeBlock = testGlobal.general.output('pre > code[data-lang="javascript"]')
      assert.match(codeBlock.html(), / +jQuery.fn.calcSubWidth/)
    })

    it('scrubs smart quotes', () => {
      const codeBlock = testGlobal.general.output('pre > code[data-lang="javascript"]')
      assert.match(codeBlock.html(), /singleQuotedStr = .*&apos;str&apos;/)
      assert.match(codeBlock.html(), /doubleQuotedStr = .*&quot;str&quot;/)
    })

    it('allows unregistered languages', () => {
      const codeBlock = testGlobal.general.output('pre')
      assert.match(codeBlock.html(), /1 \+ 1 == 5/)
    })

    it('retains code block backticks', () => {
      const codeBlock = testGlobal.general.output('pre > code[data-lang="javascript"]')
      assert.match(codeBlock.html(), /`/)
    })

    it('retains inline code backticks', () => {
      const codeBlock = testGlobal.general.output("code:contains('backtick')")
      assert.match(codeBlock.html(), /`backtick`/)
    })
  })

  describe('native code block handling', () => {
    it('formats the code blocks', () => {
      const codeBlock = testGlobal.native.output('pre > code')
      assert.exists(codeBlock.html())
      assert.equal(codeBlock.length, 3)
    })

    it('leaves the trailing heading intact', () => {
      const heading = testGlobal.native.output('h2')
      assert.equal(heading.html(), 'Heading following a code block')
    })

    it('removes code block marker unicode characters', () => {
      assert.notInclude(testGlobal.native.processedHTML, '&#xEC03;')
      assert.notInclude(testGlobal.native.processedHTML, '&#xEC02;')
    })
  })

  describe('inline code handling', () => {
    describe('with inline code disabled', () => {
      it('does not modify code block content', () => {
        const codeBlock = testGlobal.general.output("pre:contains('codeblocks will not')")
        assert.match(codeBlock.html(), /&lt;.*%-.*%&gt;/)
      })

      it('does not unescape delimited code', () => {
        const className = testGlobal.general.output("p:contains('.purplePapyrus')")
        const styleTag = className.prev()
        const openingTag = styleTag.prev()

        assert.equal(styleTag.html(), '&lt;style&gt;')
        assert.equal(openingTag.html(), '&lt;%-')
      })
    })

    describe('with inline code enabled', () => {
      it('does not modify code block content', () => {
        const codeBlock = testGlobal.inlineCode.output("pre:contains('codeblocks will not')")
        assert.match(codeBlock.html(), /&lt;.*%-.*%&gt;/)
      })

      it('properly unescapes delimited code', () => {
        const style = testGlobal.inlineCode.output("style:contains('.purplePapyrus')")
        const styledDiv = testGlobal.inlineCode.output('div.purplePapyrus')

        assert.exists(style)
        assert.exists(styledDiv)
        assert.match(style, /font-family: papyrus;/)
        assert.equal(styledDiv.text(), 'But this custom style will!')
      })
    })
  })

  describe('comment handling', () => {
    it('strips comments', () => {
      assert.notMatch(testGlobal.general.processedHTML, /This comment text will not appear/)
    })

    it('strips inline comment anchors', () => {
      const commentAnchorParent = testGlobal.general.output("p:contains('will be stripped from the')")
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
