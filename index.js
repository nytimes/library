'use strict'

const fs = require('fs')
const path = require('path')

const express = require('express')

const {getTree, getMeta} = require('./list')
const {fetchDoc} = require('./docs')

const availableLayouts = (fs.readdirSync(path.join(__dirname, 'layouts')) || [])
  .reduce((memo, filename) => {
    const [name] = filename.split('.')
    memo.add(name)
    return memo
  }, new Set())

const app = express()
app.set('view engine', 'ejs')
app.set('views', './layouts')

app.get('*', (req, res) => {
  console.log(`GET ${req.path}`)
  // get an up to date doc tree
  getTree((err, tree) => {
    if (err) {
      return res.status(500).send(err)
    }

    const id = retrieveIdForPath(req.path, tree)
    if (!id) {
      return res.status(404).end('Not found.')
    }

    // don't try to fetch a folder
    const meta = getMeta(id)
    if (meta.kind !== 'drive#file') {
      return res.status(404).end('Can\'t render contents of a folder yet.')
    }

    fetchDoc(id, (err, html) => {
      if (err) {
        return res.status(500).send(err)
      }

      const root = req.path.split('/')[1]
      const layout = availableLayouts.has(root) ? root : 'default'
      // long term, we should do some sort of render based on this
      // @TODO: add more data based on https://github.com/newsdev/nyt-docs/issues/5
      res.render(layout, {
        url: req.path,
        drivePath: '', // Populate this somehow, maybe we need to preserve drive names somewhere?
        siblings: [], // Populate this with the names of other items in the same folder
        docName: meta.name,
        content: html,
        lastUpdated: '', // determine some sort of date here
        author: meta.lastModifyingUser.displayName,
        editLink: `https://docs.google.com/document/d/${id}/edit}`,
        parentLink: '', // Populate this with an edit link to the parent folder?
        title: 'We should get this from the tree somehow'
      })
    })
  })
})

app.listen(3000)

function retrieveIdForPath(path, tree) {
  const segments = path.split('/').slice(1).filter((s) => s.length)
  // check if we have anything that matches the path
  let pointer = path === '/' ? tree : tree[segments.shift()]
  while (pointer && segments.length) {
    pointer = pointer[segments.shift()]
  }

  if (pointer && typeof pointer === 'object') {
    pointer = pointer['index']
  }

  return pointer
}
