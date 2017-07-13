<!-- NYT Library -->
========

A collaborative newsroom documentation site, powered by Google Docs.

## Running the app locally

Clone the repo:

```
git clone git@github.com:newsdev/nyt-library.git
```

Copy the preview service account credentials to the app directory:

```
cp ~***REMOVED*** nyt-library/server/.auth.json
```

Install dependencies:
```
cd nyt-library && yarn install
```

Start the app:
```
npm run build && npm run watch
```

The app should now be running on port 3000:

http://localhost.nytimes.com:3000/

http://localhost.nytimes.com:3000/graphics/how-to-make-promos


### Tests

You can run the unit tests (which exercise HTML parsing and eventually routing logic) with `npm test`.

The HTML parsing tests are based on the [Supported Formats doc](https://docs.google.com/document/d/***REMOVED***/edit).  To download a fresh copy of the HTML after making edits, run `node test/data/update.js`.


## Deploying the app

This app is hosted on the [Interactive News infrastructure](***REMOVED***/wiki).  To deploy a code change:

  * Use the [stg deploy page](https://***REMOVED***/***REMOVED***/default/deploy) to cut a release.  Once the build is complete, you'll see a link that says "Make this version active."  Click this to push the version live.  It may take a minute or two for the new version to start.
  * You can see additional information about the deployment on the [app detail page](https://***REMOVED***/***REMOVED***/default), access logs, edit environmental variables, and retrieve commands to open a bash prompt on the staging servers.
  * When you're ready to move the app to prodution, select the release tag you just created on the [prd deploy page](https://***REMOVED***/***REMOVED***/default/deploy), then click "Make this version active."

## Monitoring

Logs: [stg](***REMOVED***&minLogLevel=0&expandAll=false&advancedFilter=resource.type%20%3D%20container%20AND%20resource.labels.cluster_name%20%3D%20%22stg-adm%22%20AND%20resource.labels.namespace_id%20%3D%20%22default%22%20AND%20resource.labels.container_name%20%3D%20%22nyt-library%22) | [prd](https://console.cloud.google.com/logs/viewer?project=***REMOVED***-prd&minLogLevel=0&expandAll=false&advancedFilter=resource.type%20%3D%20container%20AND%20resource.labels.cluster_name%20%3D%20%22prd-adm%22%20AND%20resource.labels.namespace_id%20%3D%20%22default%22%20AND%20resource.labels.container_name%20%3D%20%22nyt-library%22)

When an unexpected error occurs, its stack trace is sent to [the library Airbrake project](https://***REMOVED***).

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
