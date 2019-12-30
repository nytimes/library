'use strict'

const inflight = require('promise-inflight')
const {google} = require('googleapis')
const path = require('path')
const url = require('url')

const cache = require('./cache')
const log = require('./logger')
const {getAuth} = require('./auth')
const {isSupported} = require('./utils')
const docs = require('./docs')

const driveType = process.env.DRIVE_TYPE
const driveId = process.env.DRIVE_ID

let currentTree = null // current route data by slug
let currentFilenames = null // current list of filenames for typeahead
let docsInfo = {} // doc info by id
let tags = {} // tags to doc id
let driveBranches = {} // map of id to nodes
const playlistInfo = {} // playlist info by id

// normally return the cached tree data
// if it does not exist yet, return a promise for the new tree
exports.getTree = () => currentTree || updateTree().then(({tree}) => tree)
exports.getFilenames = () => currentFilenames || updateTree().then(({filenames}) => filenames)

// exposes docs metadata
exports.getMeta = (id) => {
  return docsInfo[id]
}

exports.getDocsInfo = () => docsInfo

// returns all tags currently parsed from docs, by sort field
exports.getTagged = (tag) => {
  if (tag) return tags[tag] || []

  return tags
}

exports.getChildren = (id) => {
  return driveBranches[id]
}

exports.getPlaylist = async (id) => {
  if (playlistInfo[id]) return playlistInfo[id]

  const playlistData = await retrievePlaylistData(id)
  return playlistData
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

async function updateTree() {
  return inflight('tree', async () => {
    const authClient = await getAuth()

    const drive = google.drive({version: 'v3', auth: authClient})
    const files = await fetchAllFiles({drive, driveType})

    const updatedData = produceTree(files, driveId)
    const {tree, filenames} = updatedData
    currentTree = tree
    currentFilenames = filenames

    const count = Object.values(docsInfo)
      .filter((f) => f.resourceType !== 'folder')
      .length

    log.debug(`Current file count in drive: ${count}`)

    return updatedData
  })
}

function getOptions(id) {
  const fields = 'nextPageToken,files(id,name,mimeType,parents,webViewLink,createdTime,modifiedTime,lastModifyingUser)'

  if (driveType === 'folder') {
    return {
      q: id.map((id) => `'${id}' in parents`).join(' or '),
      fields
    }
  }

  return {
    teamDriveId: id,
    q: 'trashed = false',
    corpora: 'teamDrive',
    supportsTeamDrives: true,
    includeTeamDriveItems: true,
    // fields: '*', // setting fields to '*' returns all fields but ignores pageSize
    pageSize: 1000, // this value does not seem to be doing anything
    fields
  }
}

async function fetchAllFiles({nextPageToken: pageToken, listSoFar = [], parentIds = [driveId], driveType = 'team', drive} = {}) {
  const options = getOptions(parentIds)

  if (pageToken) {
    options.pageToken = pageToken
  }

  log.debug(`searching for files > ${listSoFar.length}`)

  // Gets files in single folder (shared) or files listed in single page of response (team)
  const {data} = await drive.files.list(options)

  const {files, nextPageToken} = data
  const combined = listSoFar.concat(files)

  // If there is more data the API has not returned for the query, the request needs to continue
  if (nextPageToken) {
    return fetchAllFiles({
      nextPageToken,
      listSoFar: combined,
      drive,
      parentIds,
      driveType
    })
  }

  // If there are no more pages and this is not a shared folder, return completed list
  if (driveType !== 'folder') return combined

  // Continue searching if shared folder, since API only returns contents of the immediate parent folder
  // Find folders that have not yet been searched
  const folders = combined.filter((item) =>
    item.mimeType === 'application/vnd.google-apps.folder' && parentIds.includes(item.parents[0]))

  if (folders.length > 0) {
    return fetchAllFiles({
      listSoFar: combined,
      drive,
      parentIds: folders.map((folder) => folder.id),
      driveType
    })
  }

  return combined
}

function produceTree(files, firstParent) {
  // NB: technically files can have multiple parents
  // may be worth filtering here based on metadata info.
  const [byParent, byId, tagIds, fileNames] = files.reduce(([byParent, byId, tagIds, fileNames], resource) => {
    const {parents, id, name, mimeType} = resource

    // prepare data for the individual file and store later for reference
    // FIXME: consider how to remove circular dependency here.
    const prettyName = docs.cleanName(name)
    const slug = docs.slugify(prettyName)
    const tagString = (name.match(/\|\s*([^|]+)$/i) || [])[1] || ''
    const tags = tagString.split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)

    if (!mimeType.includes('folder') && !tags.includes('hidden')) fileNames.push(prettyName)

    byId[id] = Object.assign({}, resource, {
      prettyName,
      tags,
      resourceType: cleanResourceType(mimeType),
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

    return [byParent, byId, tagIds, fileNames]
  }, [{}, {}, {}, []])

  const oldInfo = docsInfo
  const oldBranches = driveBranches
  tags = tagIds
  docsInfo = addPaths(byId) // update our outer cache w/ data including path information
  driveBranches = byParent
  const tree = buildTreeFromData(firstParent, {info: oldInfo, tree: oldBranches})
  return {tree: tree, filenames: fileNames}
}

function buildTreeFromData(rootParent, previousData, breadcrumb) {
  const {children, home, homePrettyName} = driveBranches[rootParent] || {}
  const parentInfo = docsInfo[rootParent] || {}

  const parentNode = {
    nodeType: children ? 'branch' : 'leaf',
    prettyName: parentInfo.prettyName,
    home,
    homePrettyName,
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
    const nextCrumb = breadcrumb ? breadcrumb.concat({id: rootParent, slug: parentInfo.slug}) : []

    if (!memo.children[slug]) {
      // recurse building up breadcrumb
      memo.children[slug] = buildTreeFromData(id, previousData, nextCrumb)
    } else {
      log.warn(`Folder ${parentInfo.name} contains duplicate resources with slug ${slug}`)
      const {name} = docsInfo[id]
      const previousDupes = memo.children[slug].duplicates || []
      memo.children[slug].duplicates = previousDupes.concat(name)
    }

    return memo
  }, Object.assign({}, parentNode, {children: {}}))
}

function addPaths(byId) {
  return Object.values(byId)
    .reduce((memo, data) => {
      const parentData = derivePathInfo(data, byId)
      memo[data.id] = Object.assign({}, data, parentData)
      return memo
    }, {})

  function derivePathInfo(item) {
    const {parents, slug, webViewLink: drivePath, isHome, resourceType, tags} = item || {}
    const parentId = parents[0]
    const hasParent = parentId && parentId !== driveId
    const parent = byId[parentId]
    const renderInLibrary = isSupported(resourceType) || tags.includes('playlist')

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
      // FIXME: we should eventually support multiple paths that documents could live in
      path: renderInLibrary ? libraryPath : drivePath
    }
  }
}

async function retrievePlaylistData(id) {
  const authClient = await getAuth()
  const sheets = google.sheets({version: 'v4', auth: authClient})
  const response = await sheets.spreadsheets.values.get({spreadsheetId: id, range: 'A1:A100'})

  // format data from api response
  const playlistIds = response.data.values.slice(1).map((link) => {
    const id = url.parse(link[0]).pathname.split('/')[3]
    return id
  })

  playlistInfo[id] = playlistIds

  return playlistIds
}

function handleUpdates(id, {info: lastInfo, tree: lastTree}) {
  const currentNode = driveBranches[id] || {}
  const lastNode = lastTree[id] || {}

  // combine current and previous children ids uniquely
  const allPages = (currentNode.children || [])
    .concat(currentNode.home || [])
    .concat(lastNode.children || [])
    .concat(lastNode.home || [])
    .filter((v, i, list) => list.indexOf(v) === i)

  // check all the nodes to see if they have changes
  allPages.forEach((id) => {
    // compare old item to new item
    const newItem = docsInfo[id] || {}
    const oldItem = lastInfo[id] || {}

    const newModified = new Date(newItem.modifiedTime)
    const oldModified = new Date(oldItem.modifiedTime)
    const hasUpdates = newModified > oldModified

    // if no updates reported from drive API, don't purge.
    if (!hasUpdates) return

    cache.purge({id: newItem.id, modified: newItem.modifiedTime}).catch((err) => {
      if (!err) return

      // Duplicate purge errors should be logged at debug level only
      if (err.message.includes('Same purge id as previous')) return log.debug(`Ignoring duplicate cache purge for ${newItem.path}`, err)

      // Ignore errors if not found or no fresh content, just allow the purge to stop
      if (err.message.includes('Not found') || err.message.includes('No purge of fresh content')) return

      // Log all other cache purge errors as warnings
      log.warn(`Cache purging error for ${newItem.path}`, err)
    })
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

async function startTreeRefresh(interval) {
  log.debug('updating tree...')

  try {
    await updateTree()
    log.debug('tree updated.')
  } catch (err) {
    log.warn('failed updating tree', err)
  }

  setTimeout(() => { startTreeRefresh(interval) }, interval)
}
