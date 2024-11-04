'use strict'

const {google} = require('googleapis')
const {getAuth} = require('./auth')
const list = require('./list')
const log = require('./logger')

const { fetchDoc } = require('./docs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const driveId = process.env.DRIVE_ID

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

exports.run = async (query, driveType = 'team') => {
  const authClient = await getAuth()

  let folderIds

  const drive = google.drive({version: 'v3', auth: authClient})

  const useLLM = query.includes('?');

  if (useLLM) {
    var oldQuery = query
    query = ""
  }

  if (driveType === 'folder') {
    folderIds = await getAllFolders({drive})
  }

  const files = await fullSearch({drive, query, folderIds, driveType})
    .catch((err) => {
      log.error(`Error when searching for ${query}, ${err}`)
      throw err
    })

  const fileMetas = files
    .map((file) => { return list.getMeta(file.id) || {} })
    .filter(({path, tags}) => (path || '').split('/')[1] !== 'trash' && !(tags || []).includes('hidden'))
  

  if (!useLLM) {
    return fileMetas;
  }

  let docsIds = []
  for (const { id, mimeType } of fileMetas) {
    if (mimeType === 'application/vnd.google-apps.document') {
      docsIds.push(id);
    }
  };


  async function docHTML(docId) {
    try {
      const response = await fetchDoc(docId, "document", {})
    const htmlContent = response.html;
    return htmlContent;
    } catch (error) {
      console.error(`Error fetching document`);
      return null;
    }
  }


  console.log("TESTING")
  console.log(oldQuery)

  const llmQuery = `Here is a question: ${oldQuery}
  Based off of the following documents, answer the question in
  a specific and instructive manner. If you cannot find an answer in the documents,
  please write "No answer could be found."
  `

  Promise.all(docsIds.map(docHTML)).then((content) => {
    LLMCall(content, llmQuery)
  });
}


async function LLMCall(chunks, query) {
  console.log("SENDING LLM QUERY")
  let prompt = query + chunks.join("\n")
  console.log(prompt)
  console.log(prompt.length)
  // const result = await model.generateContent(prompt);
  // console.log(result.response.text());  
}



async function fullSearch({drive, query, folderIds, results = [], nextPageToken: pageToken, driveType}) {
  const options = getOptions(query, folderIds, driveType)

  console.log("HELLO TESTING")
  
  if (pageToken) {
    options.pageToken = pageToken
  }

  const {data} = await drive.files.list(options)

  const {files, nextPageToken} = data
  const total = results.concat(files)

  if (nextPageToken) {
    return fullSearch({drive, query, results: total, nextPageToken, folderIds, driveType})
  }

  return total
}

// Grab all folders in directory to search through in shared drive
async function getAllFolders({nextPageToken: pageToken, drive, parentIds = [driveId], foldersSoFar = []} = {}) {
  const options = {
    ...list.commonListOptions.folder,
    q: `(${parentIds.map((id) => `'${id}' in parents`).join(' or ')}) AND mimeType = 'application/vnd.google-apps.folder'`,
    fields: 'files(id,name,mimeType,parents)'
  }

  if (pageToken) {
    options.pageToken = pageToken
  }

  const {data} = await drive.files.list(options)

  const {files, nextPageToken} = data
  const combined = foldersSoFar.concat(files)

  if (nextPageToken) {
    return getAllFolders({
      nextPageToken,
      foldersSoFar: combined,
      drive
    })
  }

  const folders = combined.filter((item) => parentIds.includes(item.parents[0]))

  if (folders.length > 0) {
    return getAllFolders({
      foldersSoFar: combined,
      drive,
      parentIds: folders.map((folder) => folder.id)
    })
  }

  return combined.map((folder) => folder.id)
}

function getOptions(query, folderIds, driveType) {
  const fields = '*'

  if (driveType === 'folder') {
    const parents = folderIds.map((id) => `'${id}' in parents`).join(' or ')
    return {
      ...list.commonListOptions.folder,
      q: `(${parents}) AND fullText contains ${JSON.stringify(query)} AND mimeType != 'application/vnd.google-apps.folder' AND trashed = false`,
      fields
    }
  }

  return {
    ...list.commonListOptions.team,
    q: `fullText contains ${JSON.stringify(query)} AND mimeType != 'application/vnd.google-apps.folder' AND trashed = false`,
    teamDriveId: driveId,
    fields
  }
}

// // If someone wanted to use an LLM with a smaller token limit, they can
// // use this function to chunk their docs content and send the chunks
// // as seperate API requests.

// function divideContent(content, threshold) {
//   const blocks = [];
//   let currentBlock = [];

//   content.forEach(item => {
//     if (currentBlock.join(" ").length + item.length <= threshold) {
//       currentBlock.push(item)
//     }
//     else {
//       if (currentBlock.length > 0) {
//         blocks.push(currentBlock);
//       }
//       currentBlock = [item]
//     }
//   });

//   if (currentBlock.length > 0) {
//     blocks.push(currentBlock);
//   }

//   return blocks
// }
