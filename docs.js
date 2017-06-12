'use strict'

const google = require('googleapis')
const {getAuth} = require('./auth')

exports.fetchDoc = (docId, cb) => {
  getAuth((err, auth) => {
    if (err) {
      return cb(err)
    }

    fetch(docId, auth, cb)
  })
}

function fetch(id, authClient, cb) {
  const drive = google.drive({version: 'v3', auth: authClient})
  drive.files.export({
    fileId: id,
    mimeType: 'text/html'
  }, cb)
}

// @TODO: more processing of archieml and html from the original google doc in here somewhere

    // const headingsAndBodyHTML = prepareHTML(body)
    // let body_html = headingsAndBodyHTML.body_html
    // let temp_matches = []
    // let matched_aml = ''
    // const aml_regex = /<p>\s*~~~\s*<\/p>(.*?)<p>\s*~~~\s*<\/p>/g
    //
    // while ((temp_matches = aml_regex.exec(body_html)) !== null) {
    //   matched_aml = matched_aml + temp_matches[1]
    // }
    //
    // body_html = body_html.replace(aml_regex, '')
    // parseArchieML(matched_aml, (result) => {
    //   cb.call(this, null, {headings: headingsAndBodyHTML.headings, body_html: body_html, aml: result })
    // })
