'use strict'

const express = require('express')

const search = require('../search')
const move = require('../move')
const router = express.Router()

const {getTree, getMeta, getTagged} = require('../list')
const {getTemplates, sortDocs, stringTemplate} = require('../utils')

router.get('/', handlePage)
router.get('/:page', handlePage)

module.exports = router

const pages = getTemplates('pages')

async function handlePage(req, res, next) {
  const page = req.params.page || 'index'

  if (!pages.has(page)) {
    return next()
  }

  const template = `pages/${page}`
  const {q, id, dest} = req.query
  if (page === 'search' && q) {
    return search.run(q)
      .then(results => {
        res.render(template, {q, results, template: stringTemplate})
      })
      .catch(next)
  }

  if (page === 'move-file' && id) {
    if (!dest) {
      return move.getFolders(id, (err, folders) => {
        if (err) return next(err)
        const {prettyName, parents} = getMeta(id)

        res.render(template, {prettyName, folders, id, parents, template: stringTemplate})
      })
    }
    
    return move.moveFile(id, dest)
      .then(result => {
        res.redirect(result)
      })
      .catch(next)
  }

  if (page === 'categories' || page === 'index') {
    return getTree((err, tree) => {
      if (err) return next(err)
      const categories = buildDisplayCategories(tree)
      res.render(template, {...categories, template: stringTemplate})
    })
  }

  res.render(template, {template: stringTemplate})
}

function buildDisplayCategories(tree) {
  const categories = Object.keys(tree.children).map((key) => {
    const data = tree.children[key]
    data.path = `/${key}` // for now
    return data
  })

  // Ignore pages at the root of the site on the category page
  const all = categories
    .map((c) => Object.assign({}, c, getMeta(c.id)))
    .filter(({resourceType, tags, isTrashCan}) => resourceType === 'folder' && !tags.includes('hidden') && !isTrashCan)
    .sort(sortDocs)
    .map((category) => {
      category.children = Object.values(category.children || {}).map(({id}) => {
        const {prettyName: name, path: url, resourceType, sort} = getMeta(id)
        return { name, resourceType, url, sort }
      }).sort(sortDocs)
      return category
    })

  const teams = getTagged('team')
    .map(getMeta)
    .sort(sortDocs)

  const featured = getTagged('featured')
    .map(getMeta)
    .sort(sortDocs)

  return {all, teams, featured}
}
