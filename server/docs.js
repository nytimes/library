'use strict'

const async = require('async')
const google = require('googleapis')
const cheerio = require('cheerio')
const pretty = require('pretty')
const unescape = require('unescape')

const {getAuth} = require('./auth')

exports.cleanName = (name = '') => {
  return name
    .replace(/^\d+[-–—_\s]*/, '') // remove leading numbers and delimiters
}

exports.slugify = (text = '') => {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
}

exports.processHtml = (html) => {
  html = normalizeHtml(html)
  html = formatCode(html)
  html = pretty(html)
  return html
}

exports.fetchDoc = (docId, cb) => {
  getAuth((err, auth) => {
    if (err) {
      return cb(err)
    }

    fetch(docId, auth, (err, html, originalRevision) => {
      if (err) return cb(err)
      html = exports.processHtml(html)
      const sections = getSections(html)
      // maybe we should pull out headers here
      cb(err, {html, originalRevision, sections})
    })
  })
}

function fetch(id, authClient, cb) {
  const drive = google.drive({version: 'v3', auth: authClient})
  async.parallel([
    (cb) => {
      drive.files.export({
        fileId: id,
        mimeType: 'text/html'
      }, cb)
    },
    (cb) => {
      drive.revisions.get({
        fileId: id,
        revisionId: '1',
        fields: '*'
      }, cb)
    }
  ], (err, [fileExport, revisionGet]) => {
    if (err) return cb(err)

    const [html] = fileExport
    const [originalRevision] = revisionGet
    cb(err, html, originalRevision)
  })
}

function normalizeHtml(html) {
  // scrub all &nbsp;s (if there is a &nbsp; in a code block it will be escaped)
  html = html.replace(/&nbsp;/g, ' ')

  const $ = cheerio.load(html)

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
        $(el).removeAttr('style') // if a <p>, <h1>, or other tag has no styles kill the style attr
      }
    }

    // remove unnecessary <span> tags (whose styles were completely scrubbed)
    if (!$(el).attr('style') && el.tagName === 'span') {
      $(el).replaceWith(el.children)
    }

    // class attribute handling
    if (['ol', 'ul'].includes(el.tagName) && $(el).attr('class')) {
      let lstClassMatch = $(el).attr('class').match(/lst-[^ ]+-(\d+)/)
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
        $(el).attr('href', hrefMatch[1])
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
  const allHeaders = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    .map((h) => `body ${h}`)
    .join(', ')

  return $(allHeaders).map((i, el) => {
    const $el = $(el)
    const name = $el.text()
    const url = `#${$el.attr('id')}`
    return {
      name,
      url
    }
  }).toArray()
}
