'use strict'

const express = require('express')

const {getTree} = require('./list')
const {fetchDoc} = require('./docs')

const app = express()
app.set('view engine', 'ejs')
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

    fetchDoc(id, (err, html) => {
      if (err) {
        return res.status(500).send(err)
      }

      console.log('render!')
      // long term, we should do some sort of render based on this
      res.render('default', {title: 'We should get this from the tree somehow', body: html})
    })
  })
})

app.listen(3000)

function retrieveIdForPath(path, tree) {
  const segments = path.split('/').slice(1)
  // check if we have anything that matches the path
  let pointer = tree[segments.shift()] || tree // point at the tree itself for root
  while (pointer && segments.length) {
    pointer = pointer[segments.shift()]
  }

  if (pointer && typeof pointer === 'object') {
    pointer = pointer['index']
  }

  return pointer
}
