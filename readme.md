nyt-docs
========

Internal Wiki for NYT Newsroom


# Running the app
Clone the repo:

`git clone git@github.com:newsdev/nyt-docs.git`

Copy the preview service account credentials to the app directory:

`cp ~***REMOVED*** nyt-docs/.auth.json`

Install dependencies:
`cd nyt-docs && yarn install`

Start the app:
`npm start`

The app should now be running on port 3000:

http://localhost.nytimes.com:3000/
http://localhost.nytimes.com:3000/graphics/how-to-make-promos


## About the file structure
The entry point to the app is index.js. This file contains the basic express server which will respond to requests for docs in the NYT Docs folder https://drive.google.com/drive/u/0/folders/***REMOVED***. It contains logic about issuing 404s and selecting the template to use based on the path.

Views (layouts) are located in the `layouts` folder, and use the `.ejs` extension, which shares a similar syntax to underscore templates.

Doc HTML and parsing is handled by the docs.js file, which exposes a single method, `fetchDoc`. This method takes the id of a google doc and a callback, and will pass the HTML of the document into the callback when it is received. Additional logic for preparing HTML after it is received from the Google Drive API should be added in this file before it is returned to index.js for render.

Traversing the contents of the NYT Docs folder is handled by the list.js file, which exposes two methods, `getTree` and `getMeta`. `getTree` fetches and async returns a nested hash (tree) of Google Drive object ids mapped to their children. It is used by the index.js file to determine whether a route is valid or not. `getMeta` synchronously returns a hash of google doc ids to metadata objects that were saved in the course of populating the tree. The tree and file metadata are repopulated into memory on an interval (currently 60s), and calling getTree multiple times will not return fresher data.

Authentication with the Google Drive v3 api is handled by the auth.js file, which exposes a single method `getAuth`. `getAuth` will either return an already instantiated authentication client or produce a fresh one. Calling `getAuth` multiple times will not produce a new authentication client if the credentials have expired; we should build this into the auth.js file later to automatically refresh the credentials on some sort of interval to prevent them from expiring.

## Previous code from tools.nyt.net
Old code that powered a react version of this app and a slightly different auth pattern has been moved into the `docs_old` folder for reference. In particular, code written for coercing Docs HTML into more minimal markup and converting to archieml may be helpful. That is located in `/docs_old/src/server/getAndParseGoogleDoc`. A small piece of this logic has been copied in as a comment inside the `/docs.js` file.
