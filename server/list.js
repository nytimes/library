'use strict'

const inflight = require('inflight')
const google = require('googleapis')
const moment = require('moment')

const {getAuth} = require('./auth')
const {cleanName, slugify} = require('./docs')
const teamDriveId = '***REMOVED***'
let currentTree = null
let docsInfo = {}
let driveBranches = {}
exports.getTree = (cb) => {
  if (currentTree) {
    return cb(null, currentTree)
  }

  updateTree(cb)
}

// exposes docs metadata
exports.getMeta = (id) => {
  let doc = docsInfo[id]
  if (doc) {
    doc.lastUpdated = moment(doc.modifiedTime).fromNow()
  }
  return doc
}

exports.getChildren = (id) => {
  return driveBranches[id]
}

// delay in ms, 60s default with env var
const treeUpdateDelay = parseInt(process.env.UPDATE_INTERVAL || 60, 10) * 1000
startTreeRefresh(treeUpdateDelay)

function updateTree(cb) {
  cb = inflight('tree', cb)
  // guard against calling while already in progress
  if (!cb) return
  // fetch all files in drive and produce routes data
  getAuth((err, authClient) => {
    if (err) {
      return cb(err)
    }

    const drive = google.drive({version: 'v3', auth: authClient})
    drive.files.list({
      teamDriveId,
      q: 'trashed = false',
      corpora: 'teamDrive',
      supportsTeamDrives: true,
      includeTeamDriveItems: true,
      fields: '*'
    }, (err, {files} = {}) => {
      if (err) {
        return cb(err)
      }

      currentTree = produceTree(files, teamDriveId)
      cb(null, currentTree)
    })
  })
}

function produceTree(files, firstParent) {
  // maybe group into folders first?
  // then build out tree, by traversing top down
  // keep in mind that files can have multiple parents
  const [byParent, byId] = files.reduce(([byParent, byId], resource) => {
    const {parents, id} = resource
    // make sure we have an array for each possible parent
    parents.forEach((parent) => {
      byParent[parent] = byParent[parent] || []
      byParent[parent].push(id)
    })

    const {name} = resource
    // should we add some extra data here at time of init?
    // maybe sort or slug or clean name?
    const prettyName = cleanName(name)
    byId[id] = Object.assign({}, resource, {
      prettyName,
      resourceType: cleanResourceType(resource.mimeType),
      sort: determineSort(name),
      slug: slugify(prettyName)
    })

    return [byParent, byId]
  }, [{}, {}])

  docsInfo = byId // update our outer cache
  driveBranches = byParent
  return buildTreeFromData(firstParent)
}

// do we care about parent ids? maybe not?
function buildTreeFromData(rootParent, breadcrumb) {
  const children = driveBranches[rootParent]
  const parentInfo = docsInfo[rootParent] || {}

  const parentNode = {
    nodeType: children ? 'branch' : 'leaf',
    id: rootParent,
    breadcrumb,
    sort: parentInfo ? determineSort(parentInfo.name) : Infinity // some number here that could be used to sort later
  }

  if (!children) {
    return parentNode
  }

  return children.reduce((memo, id) => {
    const {prettyName} = docsInfo[id]
    const slug = slugify(prettyName)
    const nextCrumb = breadcrumb ? breadcrumb.concat({ id: rootParent, slug: parentInfo.slug }) : []

    // recurse building up breadcrumb
    memo.children[slug] = buildTreeFromData(id, nextCrumb)

    // Use this to cache the reader-facing path to the page
    let path = '/'
    if (nextCrumb.length > 0) {
      path += nextCrumb.map((element) => { return element.slug }).join('/') + '/'
    }
    path += slug
    docsInfo[id].path = path

    // as well as the folder
    docsInfo[id].folder = parentInfo
    docsInfo[id].folder.path = '/' + nextCrumb.slice(0, -1).map((element) => { return element.slug }).join('/')

    return memo
  }, Object.assign({}, parentNode, { children: {} }))
}

function determineSort(name = '') {
  const sort = name.match(/(\d+)[^\d]/)
  // to be consistent with drive API, we will do string sort
  // also means we can sort off a single field when number is absent
  return sort ? sort[1] : name // items without sort go alphabetically
}

function cleanResourceType(mimeType) {
  const match = mimeType.match(/application\/vnd.google-apps.(.+)$/)
  if (!match) return mimeType

  return match[1]
}

function startTreeRefresh(interval) {
  console.log('updating tree...')
  updateTree((err) => {
    if (err) {
      console.warn('failed updating tree', err)
    }

    console.log('tree updated.')
    setTimeout(() => { startTreeRefresh(interval) }, interval)
  })
}
