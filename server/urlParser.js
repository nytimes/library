'use strict'

const {getTree, getPlaylist, getMeta} = require('./list')

exports.parseUrl = async (path) => {
  const segments = path.split('/')
  const root = segments[1]
  const tree = await getTree()
  const [data, parent] = await retrieveDataForPath(path, tree) || []
  const {id} = data || {}
  const meta = getMeta(id) || {}

  return {meta, data, parent, root}
}

async function retrieveDataForPath(path, tree) {
  const segments = path.split('/').slice(1).filter((s) => s.length)

  let pointer = tree
  let parent = null

  if (segments[0] === 'trash') {
    return
  }

  // continue traversing down the tree while there are still segments to go
  while ((pointer || {}).nodeType === 'branch' && segments.length) {
    parent = pointer
    pointer = pointer.children[segments.shift()]
  }

  if (!pointer) return

  // if the path points to a file within a playlist
  if (getMeta(pointer.id).tags.includes('playlist') && segments.length === 1) {
    const playlistInfo = await getPlaylist(pointer.id)
    let playlistFileId

    // use try/catch here because user could enter inaccessible/incorrect links in the spreadsheet
    try {
      playlistFileId = playlistInfo.find((fileId) => getMeta(fileId).slug === segments[0])
    } catch (err) {
      return
    }

    if (!playlistFileId) return

    const {id} = getMeta(playlistFileId)
    parent = pointer
    pointer = {
      id,
      // generate breadcrumb based on playlist's path
      breadcrumb: parent.breadcrumb.concat({id: parent.id})
    }
  }

  // if we are going to view a directory, switch to the home doc where possible
  if ((pointer || {}).nodeType === 'branch' && pointer.home) {
    pointer = Object.assign({}, pointer, {id: pointer.home, originalId: pointer.id})
  }

  // return the leaf and its immediate branch
  return [pointer || {}, parent]
}
