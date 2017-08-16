'use strict'

const express = require('express')

const search = require('../search')
const router = express.Router()

const {getTree, getMeta, getTagged} = require('../list')
const {getTemplates} = require('../utils')

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
      res.render(template, {categories})
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
  const grouped = categories
    .filter((child) => { return child.nodeType === 'branch' })
    .sort((a, b) => { return a.sort.localeCompare(b.sort) })
    .map((category) => {
      category = Object.assign({}, category, getMeta(category.id))
      category.children = Object.values(category.children).map(({id, nodeType}) => {
        const {prettyName: name, path: url} = getMeta(id)
        return { name, nodeType, url }
      })
      return category
    })
    .reduce((memo, category, i, all) => {
      category.tags.forEach((tag) => {
        const soFar = memo[tag] || []
        memo[tag] = soFar.concat(category)
      })

      return Object.assign({}, memo, {all})
    }, {all: []})

  return grouped
  // return {categories, teams}
}
