const {page1, page2, page3} = require('./test/fixtures/driveListing.json')
const url = require('url')
const fs = require('fs')

rewrite()

function rewrite() {
  const new1pageFiles = page1.data.files.map(obj => idMatch(obj))
  const new2pageFiles = page2.data.files.map(obj => idMatch(obj))
  const new3pageFiles = page3.data.files.map(obj => idMatch(obj))

  const finalData = {
    page1: {data: {nextPageToken: 'page2', files: new1pageFiles }},
    page2: {data: {nextPageToken: 'page3', files: new2pageFiles }},
    page3: {data: {files: new3pageFiles }},
  }

  fs.writeFile('./newFixtures.json', JSON.stringify(finalData), (err) => {
    if(err) console.log(err)
  })
}

function idMatch(obj) {
	//take id of doc, overwrite the url
  const {id, webViewLink: link} = obj
  const rootUrl = url.parse(link).pathname.split('/').slice(0,3).join('/')
  console.log(rootUrl)

  return {
    ...obj,
    webViewLink: `https://docs.google.com${rootUrl}/${id}`
  }
}
