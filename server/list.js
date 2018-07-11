'use strict'

const inflight = require('inflight')
const {google} = require('googleapis')
const path = require('path')

const cache = require('./cache')
const log = require('./logger')
const {getAuth} = require('./auth')
const {isSupported} = require('./utils')
const {cleanName, slugify} = require('./docs')

const driveId = process.env.DRIVE_ID
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

exports.getAllRoutes = () => {
  return Object.values(docsInfo)
    .filter(({path}) => path && path.slice(0, 1) === '/')
    .reduce((urls, {path}) => {
      return urls.add(path)
    }, new Set())
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
    const fetchAllFiles = process.env.DRIVE_TYPE === 'team' ? fetchAllFromTeam : fetchAllFromShared
    fetchAllFiles({drive}, (err, files) => {
      if (err) {
        return cb(err)
      }
      currentTree = produceTree(files, driveId)
      const count = Object.values(docsInfo)
        .filter((f) => f.resourceType !== 'folder')
        .length

      log.debug(`Current file count in drive: ${count}`)

      cb(null, currentTree)
    })
  })
}

async function fetchAllFromTeam({nextPageToken: pageToken, listSoFar = [], drive} = {}, cb) {
  const options = {
    teamDriveId: driveId,
    q: 'trashed = false',
    corpora: 'teamDrive',
    supportsTeamDrives: true,
    includeTeamDriveItems: true,
    // fields: '*', // setting fields to '*' returns all fields but ignores pageSize
    fields: 'nextPageToken,files(id,name,mimeType,parents,webViewLink,createdTime,modifiedTime,lastModifyingUser)',
    pageSize: 1000 // this value does not seem to be doing anything
  }

  if (pageToken) {
    options.pageToken = pageToken
  }

  log.debug(`searching for files > ${listSoFar.length}`)

  const {files, nextPageToken} = await fetchFromDrive(drive, options, cb)
  const combined = listSoFar.concat(files)

  if (nextPageToken) {
    return fetchAllFromTeam({
      nextPageToken,
      listSoFar: combined,
      drive
    }, cb)
  }

  cb(null, combined)
}

async function fetchAllFromShared({nextPageToken: pageToken, listSoFar = [], parentIds = [driveId], drive} = {}, cb) {
  const options = {
    q: createQueryString(parentIds),
    fields: 'nextPageToken,files(id,name,mimeType,parents,webViewLink,createdTime,modifiedTime,lastModifyingUser)'
  }

  if (pageToken) {
    options.pageToken = pageToken
  }

  log.debug(`searching for files > ${listSoFar.length}`)

  const {files, nextPageToken} = await fetchFromDrive(drive, options, cb)
  const combined = listSoFar.concat(files)

  if (nextPageToken) {
    return fetchAllFromShared({
      nextPageToken,
      listSoFar: combined,
      parentIds,
      drive
    }, cb)
  }

  const folders = files.filter(item => item.mimeType === 'application/vnd.google-apps.folder')

  if (folders.length > 0) {
    return fetchAllFromShared({
      listSoFar: combined,
      drive,
      parentIds: folders.map(folder => folder.id)
    }, cb)
  }

  cb(null, combined)
}

function fetchFromDrive(drive, options, cb) {
  return new Promise(resolve => {
    drive.files.list(options, (err, {data}) => {
      if (err) cb(err)
      resolve(data)
    })
  })
}

function createQueryString(parentIds) {
  return parentIds.map(id => `'${id}' in parents`).join(' or ')
}

function produceTree(files, firstParent) {
  // maybe group into folders first?
  // then build out tree, by traversing top down
  // keep in mind that files can have multiple parents
  const [byParent, byId, tagIds] = files.reduce(([byParent, byId, tagIds], resource) => {
    const {parents, id, name} = resource

    // prepare data for the individual file and store later for reference
    const prettyName = cleanName(name)
    const slug = slugify(prettyName)
    const tagString = (name.match(/\|\s*([^|]+)$/i) || [])[1] || ''
    const tags = tagString.split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)

    byId[id] = Object.assign({}, resource, {
      prettyName,
      tags,
      resourceType: cleanResourceType(resource.mimeType),
      sort: determineSort(name),
      slug,
      isTrashCan: slug === 'trash' && parents.includes(driveId)
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

  const oldInfo = docsInfo
  const oldBranches = driveBranches
  tags = tagIds
  docsInfo = addPaths(byId) // update our outer cache w/ data including path information
  driveBranches = byParent
  return buildTreeFromData(firstParent, {info: oldInfo, tree: oldBranches})
}

// do we care about parent ids? maybe not?
function buildTreeFromData(rootParent, previousData, breadcrumb) {
  const {children, home} = driveBranches[rootParent] || {}
  const parentInfo = docsInfo[rootParent] || {}

  const parentNode = {
    nodeType: children ? 'branch' : 'leaf',
    home,
    id: rootParent,
    breadcrumb,
    sort: parentInfo ? determineSort(parentInfo.name) : Infinity // some number here that could be used to sort later
  }

  // detect redirects or purge cache for items not contained in trash
  if (!parentInfo.isTrashCan) handleUpdates(rootParent, previousData)

  if (!children) {
    return parentNode
  }

  // we have to assemble these paths differently
  return children.reduce((memo, id) => {
    const {slug} = docsInfo[id]
    const nextCrumb = breadcrumb ? breadcrumb.concat({ id: rootParent, slug: parentInfo.slug }) : []

    // recurse building up breadcrumb
    memo.children[slug] = buildTreeFromData(id, previousData, nextCrumb)

    return memo
  }, Object.assign({}, parentNode, { children: {} }))
}

function addPaths(byId) {
  return Object.values(byId)
    .reduce((memo, data) => {
      const parentData = derivePathInfo(data, byId)
      memo[data.id] = Object.assign({}, data, parentData)
      return memo
    }, {})

  function derivePathInfo(item) {
    const {parents, slug, webViewLink: drivePath, isHome, resourceType} = item || {}
    const parentId = parents[0]
    const hasParent = parentId && parentId !== driveId
    const parent = byId[parentId]
    const renderInLibrary = isSupported(resourceType)

    if (hasParent && !parent) {
      log.warn(`Found file (${item.name}) with parent (${parentId}) but no parent info!`)
      return {}
    }

    const parentInfo = hasParent ? derivePathInfo(parent) : {path: '/', tags: []}
    const libraryPath = isHome ? parentInfo.path : path.join(parentInfo.path, slug)
    // the end of the path will be item.slug
    return {
      folder: Object.assign({}, parent, parentInfo), // make sure folder contains path
      topLevelFolder: hasParent ? parentInfo.folder : Object.assign({}, item),
      path: renderInLibrary ? libraryPath : drivePath
    }
  }
}

function handleUpdates(id, {info: lastInfo, tree: lastTree}) {
  const currentNode = driveBranches[id] || {}
  const lastNode = lastTree[id] || {}
  const isFirstRun = !Object.keys(lastTree).length // oldTree is empty on the first check

  // combine current and previous children ids uniquely
  const allPages = (currentNode.children || [])
    .concat(currentNode.home || [])
    .concat(lastNode.children || [])
    .concat(lastNode.home || [])
    .filter((v, i, list) => list.indexOf(v) === i)

  // check all the nodes to see if they have changes
  allPages.forEach((id) => {
    // compare old item to new item
    const newItem = docsInfo[id]
    const oldItem = lastInfo[id]

    // since we have a "trash" folder we need to account
    // for both missing items and "trashed" items
    const isTrashed = (item) => !item || item.path.split('/')[1] === 'trash'
    if (!isFirstRun && (isTrashed(newItem) || isTrashed(oldItem))) {
      const item = isTrashed(oldItem) ? newItem : oldItem
      const {path, modifiedTime} = item
      const action = isTrashed(oldItem) ? 'Added' : 'Removed'
      // @TODO: This does not restore deleted documents which are undone to the same location
      return cache.purge({
        url: path,
        modified: modifiedTime,
        editEmail: `item${action}`,
        ignore: ['missing', 'modified']
      })
    }

    // don't allow direct purges updates for folders with a home file
    const hasHome = newItem && (driveBranches[newItem.id] || {}).home
    if (hasHome) return

    // if this existed before and the path changed, issue redirects
    if (oldItem && newItem.path !== oldItem.path) {
      cache.redirect(oldItem.path, newItem.path, newItem.modifiedTime)
    } else {
      // should we be calling purge every time?
      // basically we are just calling purge because we don't know the last modified
      cache.purge({url: newItem.path, modified: newItem.modifiedTime})
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
