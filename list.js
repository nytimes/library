'use strict'

const inflight = require('inflight')
const google = require('googleapis')
const async = require('async')

const {getAuth} = require('./auth')
const teamDriveId = '***REMOVED***'
let currentTree = null
let docsInfo = {}
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

const treeUpdateDelay = 60 * 1000 // 1 min
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
      corpora: 'teamDrive',
      supportsTeamDrives: true,
      includeTeamDriveItems: true
    }, (err, {files} = {}) => {
      if (err) {
        return cb(err)
      }

      async.parallelLimit(files.map(({id}) => {
        return (cb) => {
          drive.files.get({
            fileId: id,
            fields: 'parents,properties,id,name,lastModifyingUser',
            teamDriveId,
            supportsTeamDrives: true
          }, cb)
        }
      }), 3, (err, res) => {
        if (err) {
          return cb(err)
        }

        const extended = res.map(([data], i) => {
          return Object.assign({}, data, files[i])
        })

        currentTree = produceTree(extended, teamDriveId)
        cb(null, currentTree)
      })
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

    byId[id] = resource
    return [byParent, byId]
  }, [{}, {}])

  docsInfo = byId // update our outer cache
  return buildTreeFromData(firstParent, byParent)
}

// do we care about parent ids? maybe not?
function buildTreeFromData(rootParent, byParent) {
  const children = byParent[rootParent]

  if (!children) {
    return rootParent
  }

  return children.reduce((memo, id) => {
    const {name} = docsInfo[id]
    const slug = slugify(name)
    // check if we have any children,
    memo[slug] = buildTreeFromData(id, byParent)
    return memo
  }, {})
}

function slugify(text = '') {
  return text.toLowerCase().replace(/\s+/g, '-')
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
