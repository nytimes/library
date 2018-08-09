'use strict'

const {getTree, getPlaylist, getMeta} = require('./list')

exports.parseUrl = async (path) => {
  console.log(path)
  const segments = path.split('/')
  const tree = await getTree()
  const [data, parent] = await retrieveDataForPath(path, tree) || []
  
  const {id} = data || {}
  
  const root = segments[1]
  const meta = getMeta(id)

  return {meta, data, parent}
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
    const playlistFileId = playlistInfo.find(fileId => getMeta(fileId).slug === segments[0])

    if (playlistFileId) {
      const {id} = getMeta(playlistFileId)
      const grandparent = parent
      parent = pointer
      pointer = {
        id,
        // generate breadcrumb based on playlist's path
        breadcrumb: parent.breadcrumb.concat({id: parent.id})
      }
    } else {
      throw new Error('Not found')
    }
  }

  // if we are going to view a directory, switch to the home doc where possible
  if ((pointer || {}).nodeType === 'branch' && pointer.home) {
    pointer = Object.assign({}, pointer, {id: pointer.home, originalId: pointer.id})
  }

  // return the leaf and its immediate branch
  return [pointer || {}, parent]
}
