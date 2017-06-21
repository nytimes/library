'use strict'

const async = require('async')
const google = require('googleapis')
const cheerio = require('cheerio')
const pretty = require('pretty')
const htmlToText = require('html-to-text')
const escape = require('escape-html')

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

exports.fetchDoc = (docId, cb) => {
  getAuth((err, auth) => {
    if (err) {
      return cb(err)
    }

    fetch(docId, auth, (err, html, originalRevision) => {
      if (err) return cb(err)

      html = normalizeHtml(html)
      html = formatCode(html)
      html = pretty(html)
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
  const $ = cheerio.load(html)

  $('body *').map((idx, el) => {
    // Filter the style attr on each element
    const elStyle = $(el).attr('style')
    if (elStyle) {
      // keep italic and bold style definitons
      // TODO: should we replace with <strong> and <em> eventually?
      const newStyle = elStyle.split(';').filter((styleRule) => {
        return /font-style:italic|font-weight:700/.test(styleRule)
      }).join(';')

      if (newStyle.length > 0) {
        $(el).attr('style', newStyle)
      } else if (el.tagName === 'span') { // if a span has no styles remaining, just kill it
        $(el).replaceWith($(el).text())
      } else {
        $(el).removeAttr('style') // if a <p>, <h1>, or other tag has no styles kill the style attr
      }
    }

    // remove empty <span> tags
    if (!elStyle && el.tagName === 'span') {
      $(el).replaceWith($(el).text())
    }

    // kill the class attr
    $(el).removeAttr('class')

    return el
  })

  return $('body').html()
}

function formatCode(html) {
  // Expand code blocks
  html = html.replace(/<p>```(.*?)<\/p>(.+?)<p>```<\/p>/ig, (match, codeType, content) => {
    content = htmlToText.fromString(content)
    return `<pre type="${codeType}">${formatCodeContent(content)}</pre>`
  })

  // Replace single backticks with <tt>
  html = html.replace(/`(.+?)`/g, (match, content) => {
    return `<tt>${formatCodeContent(content)}</tt>`
  })

  return html
}

function formatCodeContent(content) {
  content = escape(content)
  content = content.replace(/\n\n/g, '\n')
  content = content.replace(/[‘’]/g, "'").replace(/[””]/g, '"')
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
