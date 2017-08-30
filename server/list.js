'use strict'

const inflight = require('inflight')
const google = require('googleapis')

const cache = require('./cache')
const log = require('./logger')
const {getAuth} = require('./auth')
const {isSupported} = require('./utils')
const {cleanName, slugify} = require('./docs')

const teamDriveId = '***REMOVED***'
let currentTree = null // current route data by slug
let docsInfo = {} // doc info by id
let tags = {} // tags to doc id
let driveBranches = {} // map of id to nodes
exports.getTree = (cb) => {
  if (currentTree) {
    return cb(null, currentTree)
  }

  updateTree(cb)
}

// exposes docs metadata
exports.getMeta = (id) => {
  return docsInfo[id]
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
        byId[id].isHome = true
      }

      byParent[parentId] = parent
    })

    return [byParent, byId, tagIds]
  }, [{}, {}, {}])

  const oldTree = docsInfo
  tags = tagIds
  docsInfo = byId // update our outer cache
  driveBranches = byParent
  return buildTreeFromData(firstParent, oldTree)
}

// do we care about parent ids? maybe not?
function buildTreeFromData(rootParent, oldTree, breadcrumb) {
  const {children, home} = driveBranches[rootParent] || {}
  const parentInfo = docsInfo[rootParent] || {}

  const parentNode = {
    nodeType: children ? 'branch' : 'leaf',
    home,
    id: rootParent,
    breadcrumb,
    sort: parentInfo ? determineSort(parentInfo.name) : Infinity // some number here that could be used to sort later
  }

  extendItemsWithPath(rootParent, breadcrumb)
  handleUpdates(rootParent, oldTree) // detect redirects or purge cache
  // @TODO: detect redirects around here

  if (!children) {
    return parentNode
  }

  // we have to assemble these paths differently
  return children.reduce((memo, id) => {
    const {slug} = docsInfo[id]
    const nextCrumb = breadcrumb ? breadcrumb.concat({ id: rootParent, slug: parentInfo.slug }) : []

    // recurse building up breadcrumb
    memo.children[slug] = buildTreeFromData(id, oldTree, nextCrumb)

    return memo
  }, Object.assign({}, parentNode, { children: {} }))
}

// @TODO: put back redirect logic
function extendItemsWithPath(id, breadcrumb) {
  const parent = docsInfo[id] || {}
  const segments = (breadcrumb ? breadcrumb.concat({slug: parent.slug}) : []).map((s) => s.slug)
  const baseUrl = segments.length ? `/${segments.join('/')}` : ''

  const node = driveBranches[id] || {}
  const contents = (node.children || []).concat(node.home).filter((i) => i)

  contents.forEach((id) => {
    // at this point the new item is already assigned over the old
    const item = docsInfo[id]
    // the item will already have these props on it
    const {resourceType, webViewLink: drivePath, slug, isHome} = item

    const viewPath = isHome ? baseUrl : `${baseUrl}/${slug}`
    const renderInLibrary = isSupported(resourceType)
    item.path = renderInLibrary ? viewPath : drivePath
    if (renderInLibrary) {
      // check and issue redirects here
    }
    // we don't need to set path on parent because we are doing a depth first traversal
    item.folder = parent
  })
}

function handleUpdates(id, oldTree) {
  const node = driveBranches[id] || {}
  const children = node.children || []
  children.forEach((id) => {
    // compare old item to new item
    const newItem = docsInfo[id]
    const oldItem = oldTree[id]

     // force a purge of all ancestors for new docs
     // small possibility this does not fire while no instances are polling
     // this condition will never be true on the first poll of the instance
    if (!oldItem && Object.keys(oldTree).length) {
      // @TODO: Try to make this only fire once instead of on each instance
      return cache.purge(id, null, true)
    }

    // if this existed before and the path changed, issue redirects
    if (oldItem && newItem.path !== oldItem.path) {
      cache.redirect(oldItem.path, newItem.path)
    } else {
      cache.purge(id, newItem.modifiedTime)
    }
  })
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
