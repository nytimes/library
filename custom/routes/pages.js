'use strict'

const search = require('../search')

const router = require('express-promise-router')()

const {getTree, getFilenames, getMeta, getTagged} = require('../../server/list')
const {getTemplates, sortDocs, stringTemplate, getConfig} = require('../../server/utils')

const {iconTypes, fileTypeNames} = require('../common/fileTypes')

router.get('/', handlePage)
router.get('/:page', handlePage)

router.get('/filename-listing', async (req, res) => {
  res.header('Cache-Control', 'public, must-revalidate') // override no-cache
  const filenames = await getFilenames()
  res.json({filenames: filenames})
})

module.exports = router

const pages = getTemplates('pages')

const driveType = process.env.DRIVE_TYPE

// express-promise-router will call next() if the return value is 'next'.
async function handlePage(req, res) {
  const page = req.params.page || 'index'
  if (!pages.has(page)) return 'next'

  const template = `pages/${page}`
  const {q, autocomplete, types} = req.query
  if (page === 'search' && q) {
    return search.run(q, types, driveType).then((results) => {
      // special rule for the autocomplete case, go directly to the item if we find it.
      if (autocomplete) {
        // filter here first to make sure only _one_ document exists with this exact name
        const exactMatches = results.filter((i) => i.prettyName === q)
        if (exactMatches.length === 1) return res.redirect(exactMatches[0].path)
      }

      res.format({
        html: () => {
          res.render(template, {q, results, template: stringTemplate, iconTypes, fileTypeNames})
        },

        json: () => {
          res.json(results.map((result) => ({
            url: result.path,
            title: result.prettyName,
            lastUpdatedBy: (result.lastModifyingUser || {}).displayName,
            modifiedAt: result.modifiedTime,
            createdAt: result.createdTime,
            id: result.id,
            resourceType: result.resourceType,
            fileTypeNames
          })))
        }
      })
    })
  }

  // TODO: repurpose old getFolders/folder view from move-file as tree view for files

  if (page === 'categories' || page === 'index') {
    const tree = await getTree()
    const categories = buildDisplayCategories(tree)
    res.format({
      html: () => {
        res.render(template, {...categories, template: stringTemplate, fileTypeNames})
      },

      json: () => {
        res.json(categories.all.map((category) => ({
          url: category.path,
          title: category.prettyName,
          lastUpdatedBy: (category.lastModifyingUser || {}).displayName,
          modifiedAt: category.modifiedTime,
          createdAt: category.createdTime,
          id: category.id,
          resourceType: category.resourceType,
          fileTypeNames
        })))
      }
    })
    return
  }

  res.render(template, {template: stringTemplate, fileTypeNames})
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
        const {prettyName: name, path: url, resourceType, sort, tags} = getMeta(id)
        return {name, resourceType, url, sort, tags}
      })
        .filter(({tags}) => !tags.includes('hidden'))
        .sort(sortDocs)
      return category
    })

  const modulesConfig = getConfig('landing.modules') || []

  const modules = modulesConfig.map((module) => {
    const items = getTagged(module.tag)
      .map(getMeta)
      .sort(sortDocs)

    return {...module, items}
  })

  return {all, modules}
}
