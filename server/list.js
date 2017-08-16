'use strict'

const inflight = require('inflight')
const google = require('googleapis')
const moment = require('moment')

const cache = require('./cache')
const log = require('./logger')
const {getAuth} = require('./auth')
const {isSupported} = require('./utils')
const {cleanName, slugify} = require('./docs')

const teamDriveId = '***REMOVED***'
let currentTree = null
let docsInfo = {}
let tags = {}
let driveBranches = {}
exports.getTree = (cb) => {
  if (currentTree) {
    return cb(null, currentTree)
  }

  updateTree(cb)
}

// exposes docs metadata
exports.getMeta = (id) => {
  const doc = docsInfo[id]
  if (doc) {
    doc.lastUpdated = moment(doc.modifiedTime).fromNow()
  }
  return doc
}

// returns all tags currently parsed from docs, by sort field
exports.getTagged = (tag) => {
  if (tag) return tags[tag] || []

  return tags
}

exports.getChildren = (id) => {
  return driveBranches[id]
}

// delay in ms, 15s default with env var
const treeUpdateDelay = parseInt(process.env.LIST_UPDATE_DELAY || 15, 10) * 1000
startTreeRefresh(treeUpdateDelay)

// @TODO: page through results of tree if incompleteSearch
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
    fetchAllFiles({drive}, (err, files) => {
      if (err) {
        return cb(err)
      }

      currentTree = produceTree(files, teamDriveId)
      cb(null, currentTree)
    })
  })
}

function fetchAllFiles({nextPageToken: pageToken, listSoFar = [], drive} = {}, cb) {
  const options = {
    teamDriveId,
    q: 'trashed = false',
    corpora: 'teamDrive',
    supportsTeamDrives: true,
    includeTeamDriveItems: true,
    fields: '*',
    pageSize: 1000 // this value does not seem to be doing anything
  }

  if (pageToken) {
    options.pageToken = pageToken
  }

  drive.files.list(options, (err, data) => {
    if (err) return cb(err)

    // don't pull these out in param because explicit null/undefined is passed
    const {files, nextPageToken} = data || {}
    const combined = listSoFar.concat(files)
    if (nextPageToken) {
      return fetchAllFiles({
        nextPageToken,
        listSoFar: combined,
        drive
      }, cb)
    }

    cb(null, combined)
  })
}
function produceTree(files, firstParent) {
  // maybe group into folders first?
  // then build out tree, by traversing top down
  // keep in mind that files can have multiple parents
  const [byParent, byId, tagIds] = files.reduce(([byParent, byId, tagIds], resource) => {
    const {parents, id, name} = resource

    // prepare data for the individual file and store later for reference
    const prettyName = cleanName(name)
    const tagString = (name.match(/\|\s*([^|]+)$/i) || [])[1] || ''
    const tags = tagString.split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)

    byId[id] = Object.assign({}, resource, {
      prettyName,
      tags,
      resourceType: cleanResourceType(resource.mimeType),
      sort: determineSort(name),
      slug: slugify(prettyName)
    })

    cache.purge(id, resource.modifiedTime)

    // add the id of this item to a list of tags
    tags.forEach((t) => {
      const idsSoFar = tagIds[t] || []
      idsSoFar.push(id)
      tagIds[t] = idsSoFar
    })

    // for every parent, make sure the current file is in the list of children
    // this is used later to traverse the tree
    parents.forEach((parentId) => {
      const parent = byParent[parentId] || {children: [], home: null}
      const matchesHome = name.trim().match(/\bhome(?:,|$)/i)

      // need to do something here with tags
      // check if this is the first file for this parent with "home" at the end
      // if not it is a child, if so it is the index
      if (!matchesHome || parent.home) {
        parent.children.push(id)
      } else {
        parent.home = id
      }

      byParent[parentId] = parent
    })

    return [byParent, byId, tagIds]
  }, [{}, {}, {}])

  tags = tagIds
  docsInfo = byId // update our outer cache
  driveBranches = byParent
  return buildTreeFromData(firstParent)
}

// do we care about parent ids? maybe not?
function buildTreeFromData(rootParent, breadcrumb) {
  const {children, home} = driveBranches[rootParent] || {}
  const parentInfo = docsInfo[rootParent] || {}

  const parentNode = {
    nodeType: children ? 'branch' : 'leaf',
    home,
    id: rootParent,
    breadcrumb,
    sort: parentInfo ? determineSort(parentInfo.name) : Infinity // some number here that could be used to sort later
  }

  if (!children) {
    return parentNode
  }

  return children.reduce((memo, id) => {
    const {prettyName, resourceType, webViewLink} = docsInfo[id]
    const slug = slugify(prettyName)
    const nextCrumb = breadcrumb ? breadcrumb.concat({ id: rootParent, slug: parentInfo.slug }) : []

    // recurse building up breadcrumb
    memo.children[slug] = buildTreeFromData(id, nextCrumb)

    if (isSupported(resourceType)) {
      // Use this to cache the reader-facing path to the page
      let path = '/'
      if (nextCrumb.length > 0) {
        path += nextCrumb.map((element) => { return element.slug }).join('/') + '/'
      }
      path += slug
      docsInfo[id].path = path
    } else {
      docsInfo[id].path = webViewLink
    }

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
  log.debug('updating tree...')
  updateTree((err) => {
    if (err) {
      log.warn('failed updating tree', err)
    } else {
      log.debug('tree updated.')
    }

    setTimeout(() => { startTreeRefresh(interval) }, interval)
  })
}
