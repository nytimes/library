'use strict'

const express = require('express')

const search = require('../search')
const router = express.Router()

const {getTree, getMeta, getTagged} = require('../list')
const {getTemplates, sortDocs} = require('../utils')

router.get('/', handlePage)
router.get('/:page', handlePage)

module.exports = router

const pages = getTemplates('pages')

function handlePage(req, res, next) {
  const page = req.params.page || 'index'

  if (!pages.has(page)) {
    return next()
  }

  const template = `pages/${page}`
  const {q} = req.query
  if (page === 'search' && q) {
    return search.run(q, (err, results) => {
      if (err) return next(err)
      res.render(template, {q, results})
    })
  }

  if (page === 'categories' || page === 'index') {
    return getTree((err, tree) => {
      if (err) return next(err)
      const categories = buildDisplayCategories(tree)
      res.render(template, categories)
    })
  }

  res.render(template)
}

function buildDisplayCategories(tree) {
  const categories = Object.keys(tree.children).map((key) => {
    const data = tree.children[key]
    data.path = `/${key}` // for now
    return data
  })

  // Ignore pages at the root of the site on the category page
  const all = categories
    .filter(({nodeType}) => nodeType === 'branch')
    .sort(sortDocs)
    .map((category) => {
      category = Object.assign({}, category, getMeta(category.id))
      category.children = Object.values(category.children).map(({id}) => {
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
