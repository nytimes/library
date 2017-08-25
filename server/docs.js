'use strict'

const qs = require('querystring')

const async = require('async')
const google = require('googleapis')
const cheerio = require('cheerio')
const pretty = require('pretty')
const unescape = require('unescape')
const slugify = require('slugify')
const xlsx = require('xlsx')

const {getAuth} = require('./auth')
const supportedTypes = new Set(['document', 'spreadsheet'])
exports.cleanName = (name = '') => {
  return name
    .replace(/^\d+[-–—_\s]*/, '') // remove leading numbers and delimiters
    .replace(/\|\s*([^|]+)$/i, '')
    .replace(/\W+home$/i, '')
}

exports.slugify = (text = '') => {
  const lower = text.toLowerCase()
  return slugify(lower).replace(/['"]/g, '')
}

exports.processHtml = (html) => {
  html = normalizeHtml(html)
  html = formatCode(html)
  html = pretty(html)
  return html
}

exports.fetchDoc = ({id, resourceType}, cb) => {
  getAuth((err, auth) => {
    if (err) {
      return cb(err)
    }

    fetch({id, resourceType}, auth, (err, html, originalRevision) => {
      if (err) return cb(err)
      html = exports.processHtml(html)
      const sections = getSections(html)
      // maybe we should pull out headers here
      cb(err, {html, originalRevision, sections})
    })
  })
}

exports.fetchByline = (html, creatorOfDoc) => {
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
    byline,
    html: $.html()
  }
}

function fetch({id, resourceType}, authClient, cb) {
  const drive = google.drive({version: 'v3', auth: authClient})
  async.parallel([
    (cb) => {
      if (!supportedTypes.has(resourceType)) {
        return cb(null, `Library does not support viewing ${resourceType}s yet.`)
      }

      if (resourceType === 'spreadsheet') {
        return fetchSpreadsheet(drive, id, cb)
      }

      drive.files.export({
        fileId: id,
        mimeType: resourceType === 'presentation' ? 'text/plain' : 'text/html'
      }, (err, data) => cb(err, data)) // this prevents receiving an array (?)
    },
    (cb) => {
      drive.revisions.get({
        fileId: id,
        revisionId: '1',
        fields: '*'
      }, (err, data) => cb(err, data)) // this prevents receiving an array (?)
    }
  ], (err, [html, originalRevision]) => {
    cb(err, html, originalRevision)
  })
}

function fetchSpreadsheet(drive, id, cb) {
  drive.files.export({
    fileId: id,
    // for mimeTypes see https://developers.google.com/drive/v3/web/manage-downloads#downloading_google_documents
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }, {
    encoding: null // this returns binary data
  }, (err, buffer) => {
    if (err) return cb(err)
    const spreadsheet = xlsx.read(buffer, {type: 'buffer'})
    const {SheetNames, Sheets} = spreadsheet
    // produce some html now since we got back and xls
    const html = SheetNames.map((name) => {
      const data = Sheets[name]
      // get base html from xlsx
      const base = xlsx.utils.sheet_to_html(data)
      // manipulate with cheerio
      const $ = cheerio.load(base)
      const table = $('table')
      // add header styles
      const firstRow = $('table tr:first-of-type')
      const withHeader = firstRow.html().replace(/(<\/?)td(\s+|>)/ig, '$1th$2')
      firstRow.html(withHeader)
      // determine the last row and remove all rows after that
      const max = Object.keys(data)
        .filter((key) => key.slice(0, 1) !== '!') // ignore special rows in the sheet
        .reduce((memo, cell) => {
          const row = cell.match(/\d+/)
          const value = parseInt(row, 10)
          return value > memo ? value : memo
        }, 0)
      // remove any extra rows at the bottom of the sheet
      $(`table tr:nth-of-type(n + ${max + 1})`).remove()

      // spreadsheet names become h1 for TOC
      const slug = slugify(name)
      return [`<h1 id="${slug}">${name}</h1>`, '<table>', table.html(), '</table>'].join('\n')
    }, []).join('\n')

    // expected to be an array because of the way the google api works
    cb(null, html)
  })
}

function normalizeHtml(html) {
  // scrub all &nbsp;s (if there is a &nbsp; in a code block it will be escaped)
  html = html.replace(/&nbsp;/g, ' ')

  const $ = cheerio.load(html)

  // Remove p tags in Table of Contents
  $('p').each((index, p) => {
    // don't search any empty p tags
    if (p.children.length < 1) return

    // If the p tag has <a> tag child(ren)...
    // and the last <a> tag has an href with "#h."...
    // and the last character of the p tag is a number...
    const aTags = $(p).find('a')
    const inTableOfContents = (aTags.length > 0) && aTags[aTags.length - 1].attribs.href.match('#h.') && /(\d+$)/mig.test($(p).text())
    
    // Lucky number 7!
    // If we've passed the 8th <p> tag on the page...
    // and we're yet to see signs of a table of contents...
    // exit the loop.
    if (index > 7 && !(inTableOfContents)) { return false }
    if (inTableOfContents) { $(p).remove() }
  });

  // remove comments container in footer
  $('div').has('a[href^=#cmnt_ref][id^=cmnt]').remove()

  // as well as inline comment references
  $('sup').has('a[id^=cmnt]').remove()

  $('body *').map((idx, el) => {
    // Filter the style attr on each element
    const elStyle = $(el).attr('style')
    if (elStyle) {
      // keep italic and bold style definitons
      // TODO: should we replace with <strong> and <em> eventually?
      const newStyle = elStyle.split(';').filter((styleRule) => {
        return /font-style:italic|font-weight:700|text-decoration:underline/.test(styleRule)
      }).join(';')

      if (newStyle.length > 0) {
        $(el).attr('style', newStyle)
      } else {
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
    } else {
      $(el).removeAttr('class')
    }

    // Google HTML wraps links in a google.com redirector, extract the original link at set this as an href
    if (el.tagName === 'a' && $(el).attr('href')) {
      const hrefMatch = $(el).attr('href').match('https://www.google.com/url\\?q=(.+)&sa=')
      if (hrefMatch) {
        const decoded = qs.unescape(hrefMatch[1])
        $(el).attr('href', decoded)
      }

      // TODO if href is a drive or folder link, expand to docs.nyt.net link
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

function getSections(html) {
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
