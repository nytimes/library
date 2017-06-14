'use strict'

const google = require('googleapis')
const cheerio = require('cheerio')
const pretty = require('pretty');
const htmlToText = require('html-to-text');
const {getAuth} = require('./auth')
const escape = require('escape-html');

exports.fetchDoc = (docId, cb) => {
  getAuth((err, auth) => {
    if (err) {
      return cb(err)
    }

    fetch(docId, auth,  (err, html) => {
      html = normalizeHtml(html)
      html = formatCode(html)
      html = pretty(html)
      cb(err, html)
    })
  })
}

function fetch(id, authClient, cb) {
  const drive = google.drive({version: 'v3', auth: authClient})
  drive.files.export({
    fileId: id,
    mimeType: 'text/html'
  }, cb)
}

function normalizeHtml(html) {
  var $ = cheerio.load(html)

  $('body *').map((idx, el)  => {

    // Filter the style attr on each element
    var elStyle = $(el).attr('style')
    if(elStyle) {

      // keep italic and bold style definitons
      // TODO: should we replace with <strong> and <em> eventually?
      var newStyle = elStyle.split(';').filter((styleRule) => {
        return /font-style:italic|font-weight:700/.test(styleRule)
      }).join(';')

      if(newStyle.length > 0) {
        $(el).attr('style', newStyle)        
      } else if(el.tagName == 'span') { // if a span has no styles remaining, just kill it
        $(el).replaceWith($(el).text())
      } else {
        $(el).removeAttr('style') // if a <p>, <h1>, or other tag has no styles kill the style attr
      }
    }

    // remove empty <span> tags
    if(!elStyle && el.tagName == 'span') {
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
  html = html.replace(/<p>```(.*?)<\/p>(.+?)<p>```<\/p>/ig, function(match, codeType, content) {
    content = htmlToText.fromString(content)
    return `<pre type="${codeType}">${formatCodeContent(content)}</pre>`
  });

  // Replace single backticks with <tt>
  html = html.replace(/`(.+?)`/g, function(match, content) {
    return `<tt>${formatCodeContent(content)}</tt>`
  })

  return html
}

function formatCodeContent(content) {
  content = escape(content)
  content = content.replace(/\n\n/g, "\n")
  content = content.replace(/[‘’]/g, "'").replace(/[””]/g, '"')
  return content
}
