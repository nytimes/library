const pretty = require('pretty')
const cheerio = require('cheerio')
const qs = require('querystring')
const unescape = require('unescape')
const hljs = require('highlight.js')
const list = require('./list')

/* Your one stop shop for all your document processing needs. */

const allowInlineCode = (process.env.ALLOW_INLINE_CODE || '').toLowerCase() === 'true'
// this is getting a little long, maybe tweak so that we do subtasks separately
function normalizeHtml(html) {
  // scrub all &nbsp;s (if there is a &nbsp; in a code block it will be escaped)
  html = html.replace(/&nbsp;/g, ' ')

  const $ = cheerio.load(html)

  const $p = $('p')
  const isClean = $('meta[name="library-html-doc"]').attr('content') === '1'

  // Remove p tags in Table of Contents
  $p.each((index, p) => {
    if (p.children.length < 1) return // don't search any empty p tags

    const aTags = $(p).find('a')
    const inTableOfContents = checkForTableOfContents($, aTags)

    if (index > 0 && (inTableOfContents === false)) {
      const aTagsPrevious = $($p[index - 1]).find('a')
      const inTableOfContentsPrevious = checkForTableOfContents($, aTagsPrevious)
      // If the last <p> was in the TOC...
      // exit the loop. It is assumed that we've exited the TOC.
      if (inTableOfContentsPrevious === true) { return false }
    }
    // Lucky number 7! If we've passed the 8th <p> tag on the page...
    // and we're yet to see signs of a table of contents...exit the loop.
    if (index > 7 && !(inTableOfContents)) { return false }
    if (inTableOfContents) { $(p).remove() }
  })

  // remove comments container in footer
  $('div').has('a[href^=#cmnt_ref][id^=cmnt]').remove()

  // as well as inline comment references
  $('sup').has('a[id^=cmnt]').remove()

  $('body *').map((idx, el) => {
    // Filter the style attr on each element
    const elStyle = $(el).attr('style')
    if (elStyle) {
      // keep italic, bold and width (for images) style definitons
      // REMARK: should we replace with <strong> and <em> eventually?
      const newStyle = elStyle.split(';').filter((styleRule) => {
        if (['img'].includes(el.tagName) && /width/.test(styleRule)) { return true }
        return /font-style:italic|font-weight:700|text-decoration:underline/.test(styleRule)
      }).join(';')

      if (newStyle.length > 0) {
        $(el).attr('style', newStyle)
      } else if (!isClean) {
        $(el).removeAttr('style') // if a <p>, <h1>, or other tag has no styles, kill the style attr
      }
    }

    // remove unnecessary <span> tags (whose styles were completely scrubbed)
    if (!$(el).attr('style') && el.tagName === 'span') {
      $(el).replaceWith(el.children)
    }

    // class attribute handling
    if (['ol', 'ul'].includes(el.tagName) && $(el).attr('class')) {
      const lstClassMatch = $(el).attr('class').match(/lst-[^ ]+-(\d+)/)
      if (lstClassMatch) {
        $(el).attr('class', $(el).attr('class') + ` level-${lstClassMatch[1]}`)
      }
    } else if (!isClean) {
      $(el).removeAttr('class')
    }

    // Google HTML wraps links in a google.com redirector, extract the original link at set this as an href
    if (el.tagName === 'a' && $(el).attr('href')) {
      const [isRedirected, redirectUrl] = $(el).attr('href').match('https://www.google.com/url\\?q=(.+)&sa=') || []
      if (!isRedirected) return el

      const decoded = qs.unescape(redirectUrl)
      const [isDoc, docId] = decoded.match(/docs\.google\.com.+\/d\/([^/]+)/i) || []
      const [deepLink = ''] = decoded.match(/(?<=#heading=)([^/]+)/i) || []

      const {path: libraryPath} = isDoc ? list.getMeta(docId) || {} : {}
      const libraryDeepLink = deepLink && libraryPath ? `${libraryPath}#${deepLink}` : libraryPath

      $(el).attr('href', libraryDeepLink || decoded)
    }

    // Wrap images in a div, and add an expand button with an svg inside it
    // svg could be stored in a server side images folder, then loaded with the
    // dataLoader, but that forces normalizeHtml and its calling func to be async
    // console.time() reports about ~1ms for this entire block, both when
    // declaring the button+svg string inline or as a variable outside this func
    if (el.tagName === 'img') {
      $(el).wrap('<div class="image-wrapper"></div>')
      $(el).parent().append('<button aria-label="expand this image" title="expand this image" class="expand-image-btn"><svg width="60" height="60" viewBox="0 0 60 60" fill="none"><circle cx="30" cy="30" r="30" fill="#000" fill-opacity="0.5"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M23.9665 37.3668L26.5997 40H20V33.4003L22.6332 36.0335L26.6667 32L28 33.3333L23.9665 37.3668Z" fill="#fff"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M36.0335 22.6332L33.4003 20H40V26.5997L37.3668 23.9665L33.3333 28L32 26.6667L36.0335 22.6332Z" fill="#fff"></path></svg></button>')
    }

    return el
  })

  // preserve style block from <head>, this contains the lst- class style
  // definitions that control list appearance
  $('body').prepend($.html('head style'))

  return $('body').html()
}

function formatCode(html) {
  // Expand code blocks
  html = html.replace(/```(.*?)```/ig, (match, content) => {
    // strip interior <p> tags added by google
    content = content.replace(/(?:<\/p><p>|<br\/?>)/g, '\n').replace(/<\/?p>/g, '').trim()
    // try to find language hint within text block
    const [, lang] = content.match(/^([^\n]+)\n(.+)/) || []
    if (lang) content = content.replace(`${lang}\n`, '')

    const formattedContent = formatCodeContent(content)
    if (lang && hljs.getLanguage(lang)) {
      const textOnlyContent = cheerio.load(formattedContent).text()
      const highlighted = hljs.highlight(lang, textOnlyContent, true)
      return `<pre><code data-lang="${highlighted.language}">${highlighted.value}</code></pre>`
    }
    return `<pre><code>${formattedContent}</code></pre>`
  })

  // Replace single backticks with <code>, as long as they are not inside triple backticks
  html = html.replace(/`(.+?)`/g, (match, content) => {
    return `<code>${formatCodeContent(content)}</code>`
  })

  // for inline code option
  if (allowInlineCode) {
    const matches = []
    // get all code matches, push any that are not <pre> wrapped
    html.replace(/&lt;%-.*?\s?%&gt;(.*?<\/pre>)?/g, (codeContent, closingPre) => {
      if (!closingPre) matches.push(codeContent)
    })

    for (const codeMatch of matches) {
      // strip leading and trailing templtate delimiters
      const untaggedMatch = codeMatch.replace(/^&lt;%-/, '').replace(/%&gt;$/, '')
      // strip interior <p> tags added by google
      const escapedMatch = untaggedMatch.replace(/<\/p><p>/g, '').replace(/<\/?p>/g, '')
      html = html.replace(codeMatch, unescape(escapedMatch))
    }
  }

  return html
}

function formatCodeContent(content) {
  content = content.replace(/[‘’]|&#x201[89];/g, "'").replace(/[“”]|&#x201[CD];/g, '"') // remove smart quotes
  content = content.replace(/`/g, '&#96;') // remove internal cases of backticks
  return content
}

function checkForTableOfContents($, aTags) {
  return aTags.length === 2 && // TOC links title and number
  aTags[0].attribs.href.match('#h.') && // the links go to a heading in the doc
  aTags[0].attribs.href === aTags[1].attribs.href && // they should both link the the same heading
  /(\d+$)/mg.test($(aTags[1]).text()) // the second link should contain only a number
}

function fetchByline(html, creatorOfDoc) {
  let byline = creatorOfDoc
  const $ = cheerio.load(html)

  // Iterates through all p tags to find byline
  $('p').each((index, p) => {
    // don't search any empty p tags
    if (p.children.length < 1) return

    // regex that checks for byline
    const r = /^by.+[^.\n]$/mig
    if (r.test(p.children[0].data)) {
      byline = p.children[0].data
      // Removes the word "By"
      byline = byline.slice(3)
      $(p).remove()
    }

    // only check the first p tag
    return false
  })

  return {
    html: $('head').html() + $('body').html(), // include head for list style block
    byline
  }
}

function fetchSections(html) {
  const $ = cheerio.load(html)
  const headers = ['h1', 'h2']
    .map((h) => `body ${h}`)
    .join(', ')

  const ordered = $(headers).map((i, el) => {
    const tag = el.name
    const $el = $(el)
    const name = $el.text()
    const url = `#${$el.attr('id')}`
    return {
      name,
      url,
      level: parseInt(tag.slice(-1), 10)
    }
  }).toArray()

  // take our ordered sections and turn them into appropriately nested headings
  const nested = ordered.reduce((memo, heading) => {
    const tail = memo.slice(-1)[0]
    const extended = Object.assign({}, heading, {subsections: []})
    if (!tail || heading.level <= tail.level) {
      return memo.concat(extended)
    }

    tail.subsections.push(heading)
    return memo
  }, [])

  return nested
}

function convertYoutubeUrl(content) {
  // convert youtube url into embeded
  const youtubeUrl = /(>(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+?)<)/g
  const replacement = '><iframe width="560" height="315" src="https://www.youtube.com/embed/$2" frameborder="0" allowfullscreen></iframe><'
  content = content.replace(youtubeUrl, replacement)
  return content
}

function getProcessedHtml(src) {
  let html = normalizeHtml(src)
  html = convertYoutubeUrl(html)
  html = formatCode(html)
  html = pretty(html)
  return html
}

exports.getProcessedDocAttributes = (driveDoc) => {
  // document information
  // TODO: guard against null revision data?
  const [originalHtml, {data: revisionData}] = driveDoc
  // clean and prettify the HTML
  const processedHtml = getProcessedHtml(originalHtml)
  // crawl processed html for the bylines and sections
  const sections = fetchSections(processedHtml)
  const createdBy = ((revisionData || {}).lastModifyingUser || {}).displayName
  const {byline, html} = fetchByline(processedHtml, createdBy)

  return {html, byline, createdBy, sections}
}
