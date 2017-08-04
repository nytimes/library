'use strict'

const cache = {} // simple path to html cache
const byId = {} // id to last modified + paths

exports.middleware = ({path}, res, next) => {
  const cachedHTML = cache[path]
  if (cachedHTML) {
    console.log(`Serving cached response to ${path}.`)
    return res.end(cachedHTML)
  }

  next()
}

exports.add = (id, modified, path, html) => {
  if (!modified) return // refused to add anything without a modified timestamp

  cache[path] = html
  const data = byId[id] || {paths: new Set(), modified}
  data.paths.add(path)

  byId[id] = data
}

// we may get extra purge requests, so just purge whenever the modified time changes
exports.purge = (id, newModified) => {
  const data = byId[id]
  if (!data) return
  // skip purging items which have not changed
  if (data.modified === newModified) return

  data.paths.forEach((path) => {
    const segments = path.split('/').map((segment, i, segments) => {
      return segments.slice(0, i).concat([segment]).join('/')
    })

    // don't just purge the top path, purge all the parents too.
    segments.forEach((url) => {
      if (!cache[url]) return
      console.log(`Purching cache of ${url}`)
      delete cache[url]
    })
  })
}
