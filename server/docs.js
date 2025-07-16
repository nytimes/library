'use strict'

const {google} = require('googleapis')
const cheerio = require('cheerio')
const xlsx = require('xlsx')

const cache = require('./cache')
const formatter = require('./formatter')
const log = require('./logger')
const {getAuth} = require('./auth')
const {slugify} = require('./text')

const supportedTypes = new Set(['document', 'spreadsheet', 'text/html'])

const revisionSupportedArr = ['document', 'spreadsheet', 'presentation']
const revisionSupported = new Set(revisionSupportedArr)
const revisionMimeSupported = new Set(revisionSupportedArr.map((x) => `application/vnd.google-apps.${x}`))

exports.fetchDoc = async (id, resourceType, req) => {
  const data = await cache.get(id)
  if (data && data.content) {
    log.info(`CACHE HIT ${req.path}`)
    return data.content
  }

  const auth = await getAuth()

  const driveDoc = await fetch({id, resourceType, req}, auth)
  const originalRevision = driveDoc[1]

  const {html, byline, createdBy, sections} = formatter.getProcessedDocAttributes(driveDoc)
  const payload = {html, byline, createdBy, sections}

  // cache only information from document body if mimetype supports revision data
  if (revisionMimeSupported.has(originalRevision.data.mimeType)) {
    cache.add(id, originalRevision.data.modifiedTime, payload)
  } else {
    console.log(`Skipping cache add: unsupported mimetype ${originalRevision.data.mimeType}`)
  }
  return payload
}

async function fetchHTMLForId(id, resourceType, req, drive) {
  if (!supportedTypes.has(resourceType)) {
    return `Library does not support viewing ${resourceType}s yet.`
  }

  if (resourceType === 'spreadsheet') {
    return fetchSpreadsheet(drive, id)
  }

  if (resourceType === 'text/html') {
    return fetchHTML(drive, id)
  }

  const {data} = await drive.files.export({
    fileId: id,
    // text/html exports are not suupported for slideshows
    mimeType: resourceType === 'presentation' ? 'text/plain' : 'text/html'
  })
  return data
}

async function fetchOriginalRevisions(id, resourceType, req, drive) {
  if (!revisionSupported.has(resourceType)) {
    log.info(`Revision data not supported for ${resourceType}:${id}`)
    return {data: {lastModifyingUser: {}}} // return mock/empty revision object
  }
  return drive.revisions.get({
    fileId: id,
    revisionId: '1',
    fields: '*'
  }).catch((err) => {
    log.warn(`Failed retrieving revision data for ${resourceType}:${id}. Error was:`, err)
    return {data: {lastModifyingUser: {}}} // return mock/empty revision object
  })
}

async function fetch({id, resourceType, req}, authClient) {
  const drive = google.drive({version: 'v3', auth: authClient})
  const documentData = await Promise.all([
    fetchHTMLForId(id, resourceType, req, drive),
    fetchOriginalRevisions(id, resourceType, req, drive)
  ])
  return documentData
}

async function fetchSpreadsheet(drive, id) {
  const {data} = await drive.files.export({
    fileId: id,
    // for mimeTypes see https://developers.google.com/drive/v3/web/manage-downloads#downloading_google_documents
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }, {
    // HTML export for sheets is limiting. Instead, download as a buffer and use
    // the xlsx library to parse the contents of the file and convert to HTML.
    responseType: 'arraybuffer'
  })

  const spreadsheet = xlsx.read(data, {type: 'buffer'})
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
  return html
}

// returns raw html from the drive
async function fetchHTML(drive, id) {
  const {data} = await drive.files.get({
    fileId: id,
    supportsTeamDrives: true,
    alt: 'media'
  })
  return data
}
