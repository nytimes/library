nyt-docs
========

Internal Wiki for NYT Newsroom

# Running the app

Clone the repo:

```
git clone git@github.com:newsdev/nyt-docs.git
```

Copy the preview service account credentials to the app directory:

```
cp ~***REMOVED*** nyt-docs/.auth.json
```

Install dependencies:
```
cd nyt-docs && yarn install
```

Start the app:
```
npm start
```

The app should now be running on port 3000:

http://localhost.nytimes.com:3000/

http://localhost.nytimes.com:3000/graphics/how-to-make-promos


## App structure

### Server

The main entry point to the app is index.js.

This file contains the basic express server which will respond to requests for docs in the [NYT Docs Team Drive](https://drive.google.com/drive/u/0/folders/***REMOVED***). It contains logic about issuing 404s and selecting the template to use based on the path.

### Views

Views (layouts) are located in the `layouts` folder.  They use the `.ejs` extension, which is a syntax similar to underscore templates.

[TK, where should styles and scripts go]


### Doc parsing

Doc HTML fetch and parsing is handled by `docs.js`.  fetchDoc` takes the ID of a Google doc and a callback, then passes the HTML of the document into the callback once it has ben downloaded and processed.

### Listing the drive

Traversing the contents of the NYT Docs folder is handled by [`list.js`](https://github.com/newsdev/nyt-docs/blob/master/list.js).  There are two exported functions:

  * `getTree` is an async call that returns a nested hash (tree) of Google Drive Folder IDs mapped to their children. It is used by the server to determine whether a route is valid or not.

  * `getMeta` synchronously returns a hash of Google Doc IDs to metadata objects that were saved in the course of populating the tree. [TK what does htis metadata contain].

The tree and file metadata are repopulated into memory on an interval (currently 60s). Calling getTree multiple times will not return fresher data.

### Auth

Authentication with the Google Drive v3 api is handled by the auth.js file, which exposes a single method `getAuth`. `getAuth` will either return an already instantiated authentication client or produce a fresh one. Calling `getAuth` multiple times will not produce a new authentication client if the credentials have expired; we should build this into the auth.js file later to automatically refresh the credentials on some sort of interval to prevent them from expiring.

### Previous code from tools.nyt.net

Old code that powered a react version of this app and a slightly different auth pattern has been moved into the `docs_old` folder for reference. In particular, code written for coercing Docs HTML into more minimal markup and converting to archieml may be helpful. That is located in `/docs_old/src/server/getAndParseGoogleDoc`. A small piece of this logic has been copied in as a comment inside the `/docs.js` file.
