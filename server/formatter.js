const pretty = require('pretty')
const cheerio = require('cheerio')
const qs = require('querystring')
const unescape = require('unescape')
const list = require('./list')
const log = require('./logger')

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
      // TODO: should we replace with <strong> and <em> eventually?
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

      const {path: libraryPath} = isDoc ? list.getMeta(docId) || {} : {}

      $(el).attr('href', libraryPath || decoded)
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
  html = html.replace(/<p>```(.*?)<\/p>(.+?)<p>```<\/p>/ig, (match, codeType, content) => {
    // strip interior <p> tags added by google
    content = content.replace(/<\/p><p>/g, '\n').replace(/<\/?p>/g, '')

    return `<pre type="${codeType}">${formatCodeContent(content)}</pre>`
  })

  // Replace single backticks with <tt>
  html = html.replace(/`(.+?)`/g, (match, content) => {
    return `<tt>${formatCodeContent(content)}</tt>`
  })

  html = html.replace(/&lt;%-(.+)%&gt;/g, (match, content) => {
    const html = unescape(content)
    return formatCodeContent(html)
  })

  return html
}

function formatCodeContent(content) {
  content = content.replace(/[‘’]|&#x201[89];/g, "'").replace(/[“”]|&#x201[CD];/g, '"') // remove smart quotes
  return content
}

function checkForTableOfContents($, aTags) {
  return aTags.length === 2 && // TOC links title and number
  aTags[0].attribs.href.match('#h.') && // the links go to a heading in the doc
  aTags[0].attribs.href === aTags[1].attribs.href && // they should both link the the same heading
  /(\d+$)/mg.test($(aTags[1]).text()) // the second link should contain only a number
}

/** BETA API JSON PARSING BELOW */

function htmlEncode(str) {
  return str.replace(/[\x26<>'"]/g, (str) => {
    return `&#${str.charCodeAt(0)};`
  })
}

function scrubSmartQuotes(text) {
  return text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
}

function formatCodeInline(textRun) {
  return scrubSmartQuotes(textRun.replace(/`([^`].*?)`/g, '<tt>$1</tt>'))
}

function formatCodeBlocks(html) {
  const codeBlockRe = /<p>```(.+)?\n?([\s\S]*?)<p>```/gi
  html = html.replace(codeBlockRe, (match, codeType, content) => {
    // remove paragraph elements
    content = content.replace(/<\/p><p>/g, '').replace(/<\/?p>/g, '')
    // newlines are LINE TABULATIONs for some reason, trim trailing newline
    content = content.replace(/\u000b/gi, '\n').replace(/\n$/, '')
    return `<pre type="${codeType}">${content}</pre>`
  })
  return scrubSmartQuotes(html)
}

function formatParagraph(json) {
  const text = json.elements.map((elt) => {
    if (elt.textRun) {
      let content = htmlEncode(elt.textRun.content)
      content = formatCodeInline(content)
      return content
    }

    // TODO: handle inline objects when the API makes them available
  }).join('')
  return `<p>${text}</p>`
}

function formatTable(json) {
  let html = ''
  const rows = json.tableRows

  rows.forEach((row) => {
    let rowHtml = ''
    row.tableCells.forEach((cell) => {
      const cellContents = exports.jsonToHtml(cell)
      const colspan = cell.tableCellStyle.columnSpan
      rowHtml += colspan > 1 ? `<td colspan="${colspan}">${cellContents}</td>`
                             : `<td>${cellContents}</td>`
    })
    html += `<tr>${rowHtml}</tr>`
  })
  return `<table>${html}</table>`
}

exports.jsonToHtml = (json) => {
  const body = json.body ? json.body.content : json.content
  let html = ''

  body.forEach((element) => {
    const contentKeys = Object.keys(element)
    contentKeys.forEach((contentType) => {
      switch (contentType) {
        case 'paragraph':
          html += formatParagraph(element[contentType])
          break
        case 'table':
          html += formatTable(element[contentType])
          break
        default:
          if (contentType.includes('Index')) { break }
          log.debug('Unsupported Structural Element type', contentType)
          break
      }
    })
  })

  html = formatCodeBlocks(html)
  return pretty(html)
}

exports.getProcessedHtml = (src) => {
  if (process.env.BETA_API) {
    return exports.jsonToHtml(src)
  }
  let html = normalizeHtml(src)
  html = formatCode(html)
  html = pretty(html)
  return html
}
