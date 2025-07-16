'use strict'

const inflight = require('promise-inflight')
const {google} = require('googleapis')
const path = require('path')

const cache = require('./cache')
const log = require('./logger')
const {getAuth} = require('./auth')
const {isSupported} = require('./utils')
const {cleanName, slugify} = require('./text')

const driveType = process.env.DRIVE_TYPE
const driveId = process.env.DRIVE_ID
const MAX_QUERY_TERMS = 150 // max query terms allowed by google in a search request
const driveTimeout = parseInt(process.env.DRIVE_TIMEOUT_SECONDS, 10) || 60

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

exports.commonListOptions = {
  folder: {
    corpora: 'allDrives',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    pageSize: 1000
  },
  team: {
    q: 'trashed = false',
    corpora: 'teamDrive',
    supportsTeamDrives: true,
    includeTeamDriveItems: true,
    pageSize: 1000
  }
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
      ...exports.commonListOptions.folder,
      q: id.map((id) => `'${id}' in parents`).join(' or '),
      fields
    }
  }

  return {
    teamDriveId: id,
    ...exports.commonListOptions.team,
    // fields: '*', // setting fields to '*' returns all fields but ignores pageSize
    fields
  }
}

async function fetchAllFiles({parentIds = [driveId], driveType = 'team', drive} = {}) {
  const options = getOptions(parentIds)
  const levelItems = []

  do {
    // Gets files in single folder (shared) or files listed in single page of response (team)
    const {data} = await Promise.race([
      drive.files.list(options),
      new Promise((resolve, reject) => setTimeout(() => reject(Error('drive.files.list timeout expired!')), driveTimeout * 1000))
    ])

    options.pageToken = data.nextPageToken
    levelItems.push(...data.files)
    log.debug(`fetched ${data.files.length} files and folders (total: ${levelItems.length}), ${data.nextPageToken ? '' : 'no '}more results to fetch`)
  } while (options.pageToken)

  // If this is not a shared folder, return completed list
  if (driveType !== 'folder') return levelItems

  // Continue searching if shared folder, since API only returns contents of the immediate parent folder
  // Find folders that have not yet been searched
  const folderIds = levelItems.filter((item) =>
    item.mimeType === 'application/vnd.google-apps.folder' && parentIds.includes(item.parents[0]))
    .map((folder) => folder.id)

  const folderPartitions = []
  while (folderIds.length > 0) {
    folderPartitions.push(folderIds.splice(0, MAX_QUERY_TERMS))
  }
  const partitionPromises = folderPartitions.map((partition) =>
    fetchAllFiles({
      drive,
      parentIds: partition,
      driveType
    })
  )
  const partitionList = await Promise.all(partitionPromises)
  const itemsSoFar = levelItems.concat([].concat.apply([], partitionList))
  log.debug(`all files and folders under this level: ${itemsSoFar.length}`)
  return itemsSoFar
}

function produceTree(files, firstParent) {
  // NB: technically files can have multiple parents
  // may be worth filtering here based on metadata info.
  const [byParent, byId, tagIds, fileNames] = files.reduce(([byParent, byId, tagIds, fileNames], resource) => {
    const {parents, id, name, mimeType} = resource

    // prepare data for the individual file and store later for reference
    const prettyName = cleanName(name)
    const slug = slugify(prettyName)
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

  const newDocsInfo = addPaths(byId)

  // if docsInfo exists, asynchrononsly check if any files have been moved
  if (Object.keys(docsInfo).length) setRedirects(docsInfo, newDocsInfo)

  docsInfo = newDocsInfo // update our outer cache w/ data including path information
  driveBranches = byParent
  const tree = buildTreeFromData(firstParent, {info: oldInfo, tree: oldBranches})
  return {tree: tree, filenames: fileNames}
}

async function setRedirects(oldDocsInfo, newDocsInfo) {
  Object.keys(newDocsInfo).forEach((id) => {
    const currPath = newDocsInfo[id] && newDocsInfo[id].path
    const lastPath = oldDocsInfo[id] && oldDocsInfo[id].path
    // if no currPath, file was removed from the drive
    // if no lastPath, file is a new addition to the drive
    if (currPath && lastPath && currPath !== lastPath) {
      log.info(`Doc ${id} moved, REDIRECT ${lastPath} → ${currPath}`)
      cache.add(lastPath, new Date(), {redirect: currPath}, 0)
    }
  })
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
    const id = new URL(link[0]).pathname.split('/')[3]
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
      if (err.message.includes('Same purge id as previous')) return log.debug(`Ignoring duplicate cache purge for ${newItem.path}`)

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
