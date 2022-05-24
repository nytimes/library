Library [![Build Status](https://cloud.drone.io/api/badges/nytimes/library/status.svg)](https://cloud.drone.io/nytimes/library) ![Supported node versions](https://img.shields.io/badge/dynamic/json?color=informational&label=node&query=%24.engines.node&url=https%3A%2F%2Fraw.githubusercontent.com%2Fnytimes%2Flibrary%2Fmain%2Fpackage.json)
========

A collaborative newsroom documentation site, powered by Google Docs.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Demo Site & User Guide](#demo-site--user-guide)
- [Contacting us](#contacting-us)
- [Community](#community)
- [Contributing](#contributing)
- [Questions](#questions)
- [Development Workflow](#development-workflow)
  - [Tests](#tests)
- [Customization](#customization)
- [Deploying the app](#deploying-the-app)
  - [Using Heroku](#using-heroku)
  - [Using Google App Engine](#using-google-app-engine)
  - [Using Docker](#using-docker)
  - [Standard Deployment](#standard-deployment)
- [App structure](#app-structure)
  - [Server](#server)
  - [Views](#views)
  - [Doc parsing](#doc-parsing)
  - [Listing the drive](#listing-the-drive)
  - [Auth](#auth)
  - [User Authentication](#user-authentication)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
## AdHoc Updates

### Templating Engine

The Library Catalog utilizes EJS as the templating engine.  The documentation can be found [here](https://ejs.co/).

The `template()` retrieves strings from the `strings.yaml` file where template string:

`template('search.results.label.person')`

will render whats specified in the `strings.yaml` file:

```
search:
  results:
    label:
      person: ...
```

### Route Handler Hooks

Router handlers can be customized by creating custom handlers in:

```
/custom/routes/...
```

For example, to create a custom page handler:

1. Create a copy of the file `/server/routes/pages.js` and put it in `/custom/routes/pages.js`
2. Customize pages.js as needed
3. Make sure all `require()` references the files the server directory. Example: `require('../../server/list')` or `require('../../utils')` and use `requireWithFallback()`.

This would be useful in cases if you wanted to modify data without resorting to middleware.  An example would be adding a property to the response without writing middleware to parse the payload or override `response.send()`.


---
## Demo Site & User Guide

Documentation about how to get started with Library is hosted as a working (read only) demo on Heroku. Consult the site for more detailed instructions than this readme about how to get the most out of Library: https://nyt-library-demo.herokuapp.com.

## Contacting us

Love Library? Let us know by [joining our Google Group](https://groups.google.com/forum/#!forum/nyt-library-community) and dropping us a line. You'll also stay up to date with the latest Library features via our release notes, which get sent to this list.

## Community

Here are some of the organizations using Library so far.

[Marketplace](https://www.marketplace.org/)

[The New York Times](http://nytimes.com)

[Northwestern University Knight Lab](https://knightlab.northwestern.edu)

[Star Tribune](http://www.startribune.com)

[WBEZ](https://www.wbez.org)

[The Los Angeles Times Data and Graphics Department](https://twitter.com/palewire/status/1326220493762883585)

## Contributing

See [CONTRIBUTING.md](https://github.com/nytimes/library/blob/master/CONTRIBUTING.md) for information on how to contribute code and/or documentation on GitHub or on the [demo site](https://nyt-library-demo.herokuapp.com).

## Questions

If you have questions about how to get your copy of Library up and running, [join our Google Group](https://groups.google.com/forum/#!forum/nyt-library-community), and let us know what you're running into. We also keep an eye on the #proj-library channel in the News Nerdery Slack. We'll do our best to answer your questions.

## Development Workflow

1. Clone and `cd` into the repo:

   `git clone git@github.com:nytimes/library.git && cd library`


2. From the Google API console, create or select a project, then create a service account with the Cloud Datastore User role. It should have API access to Drive and Cloud Datastore. Store these credentials in `server/.auth.json`.

   - To use oAuth, you will also need to create oAuth credentials.
   - To use the Cloud Datastore API for reading history, you will need to add in your `GCP_PROJECT_ID`.

3. Install dependencies:

   `npm install --no-optional`

4. Create a `.env` file at the project root. An example `.env` might look like

```bash
# node environment (development or production)
NODE_ENV=development
# Google oAuth credentials
GOOGLE_CLIENT_ID=123456-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=abcxyz12345
GCP_PROJECT_ID=library-demo-1234
# comma separated list of approved access domains or email addresses (regex is supported).
APPROVED_DOMAINS="nytimes.com,dailypennsylvanian.com,(.*)?ar.org,demo.user@demo.site.edu"
SESSION_SECRET=supersecretvalue

# Google drive Configuration
# team or folder ("folder" if using a folder instead of a team drive)
DRIVE_TYPE=team
# the ID of your team's drive or shared folder. The string of random numbers and letters at the end of your team drive or folder url.
DRIVE_ID=0123456ABCDEF
```
Make sure to not put any comments in the same line as `DRIVE_TYPE` and `DRIVE_ID` vars.

Ensure you share your base drive or folder with the email address associated with the service account created in step 2.

**Be careful!** Setting NODE_ENV to `development` changes the built in behaviors for site authentication to allow accounts other than those in the APPROVED_DOMAINS list. **Never use NODE_ENV=development for your deployed site, only locally.**

5. Start the app:

   `npm run watch`

The app should now be running at `localhost:3000`. Note that Library requires Node v8 or higher.

### Tests
You can run functional and unit tests, which test HTML parsing and routing logic, with `npm test`. A coverage report can be generated by running `npm run test:cover`.

The HTML parsing tests are based on the [Supported Formats doc](https://docs.google.com/document/d/12bUE9b4_aF_IfhxCLdHApN8KKXwa4gQUCGkHzt1FyRI/edit).  To download a fresh copy of the HTML after making edits, run `node test/utils/updateSupportedFormats.js`.

## Customization
Styles, text, caching logic, and middleware can be customized to
match the branding of your organization. This is covered in the [customization readme](https://github.com/nytimes/library/blob/master/custom/README.md).

A sample customization repo is provided at [nytimes/library-customization-example](https://github.com/nytimes/library-customization-example).


## Deploying the app
Wherever you deploy Library, you'll likely want to [set up a Google service account](https://console.cloud.google.com/iam-admin/serviceaccounts) and [OAuth 2.0 client](https://developers.google.com/identity/protocols/OAuth2) Set up your service account with API access to Drive and Cloud Datastore.

If you wish to deploy Library with customizations, create a git repo with the files you would like to include. Set the `CUSTOMIZATION_GIT_REPO` environment variable to the cloning URL. Files in the repo and packages specified in the `package.json` will be included in your library installation.

For more detailed instructions, consult the Getting Started section of the demo site: https://nyt-library-demo.herokuapp.com/get-started

### Using Heroku

This button can quickly deploy to Heroku:
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://nyti.ms/2CrT2y2)

Set your app's `GOOGLE_APPLICATION_JSON`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` with values from the service account and Oauth client. Add *<your-heroku-app-url\>.com* as an authorized domain in the general OAuth consent screen setup and then add *http://<your-heroku-app-url\>.com/auth/redirect* as the callback url in the OAuth credential setup itself.

### Using Google App Engine
You can also deploy Library to GAE, using the included `app.yaml`. Note that you will need to enable billing on your GCP project in order to use Google App Engine. More detailed instructions are provided on the [demo site](https://nyt-library-demo.herokuapp.com/get-started/deploying-library-google-app-engine).

### Using Docker [![Dockerhub](https://img.shields.io/docker/v/nytimes/library?logo=docker)](https://hub.docker.com/r/nytimes/library/tags)
Library can be used as a base image for deployment using Docker. This allows you
to automate building and deploying a custom version of Library during Docker's
build phase. If you create a repo with the contents of your `custom` folder, you
could deploy library from that repo with a Dockerfile like the following:

```Dockerfile
FROM nytimes/library

# copy custom files to library's custom repo
COPY . ./custom/

# move to a temporary folder install custom npm packages
WORKDIR /usr/src/tmp
COPY package*.json .npmrc ./
RUN npm i
# copy node modules required by custom node modules
RUN yes | cp -rf ./node_modules/* /usr/src/app/node_modules

# return to app directory and build
WORKDIR /usr/src/app
RUN npm run build

# start app
CMD [ "npm", "start" ]
```

### Standard Deployment
Library is a standard node app, so it can be deployed just about anywhere. If you are looking to deploy to a standard VPS, [Digital Ocean's tutorials](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04) are a great resource.

## App structure

### Server
The main entry point to the app is `index.js`.

This file contains the express server which will respond to requests for docs
in the configured team drive or shared folder. Additionally, it contains logic
about issuing 404s and selecting the template to use based on the path.

### Views
Views (layouts) are located in the `layouts` folder. They use the `.ejs`
extension, which uses a syntax similar to underscore templates.

Base styles for the views are in the `styles` directory containing Sass files.
These files are compiled to CSS and placed in `public/css`.

### Doc parsing
Doc HTML fetch and parsing is handled by `docs.js`. `fetchDoc` takes the ID of a
Google doc and a callback, then passes the HTML of the document into the
callback once it has been downloaded and processed.

### Listing the drive
Traversing the contents of the NYT Docs folder is handled by `list.js`. There
are two exported functions:

* `getTree` is an async call that returns a nested hash (tree) of Google Drive
  Folder IDs mapped to their children. It is used by the server to determine
  whether a route is valid or not.

* `getMeta` synchronously returns a hash of Google Doc IDs to metadata objects
  that were saved in the course of populating the tree. This metadata includes
  edit history, document authors, and parent folders.

The tree and file metadata are repopulated into memory on an interval (currently 60s). Calling getTree multiple times will not return fresher data.

### Auth

Authentication with the Google Drive v3 api is handled by the auth.js file, which exposes a single method `getAuth`. `getAuth` will either return an already instantiated authentication client or produce a fresh one. Calling `getAuth` multiple times will not produce a new authentication client if the credentials have expired; we should build this into the auth.js file later to automatically refresh the credentials on some sort of interval to prevent them from expiring.

### User Authentication

Library currently supports both Slack and Google Oauth methods. As Library sites are usually intended to be internal to a set of limited users, Oauth with your organization is strongly encouraged. To use Slack Oauth, specify your Oauth strategy in your `.env` file, like so:
```
# Slack needs to be capitalized as per the Passport.js slack oauth docs http://www.passportjs.org/packages/passport-slack-oauth2/
OAUTH_STRATEGY=Slack
```
You will need to provide Slack credentials, which you can do by creating a Library Oauth app in your Slack workspace. After creating the app, save the app's `CLIENT_ID` and `CLIENT_SECRET` in your `.env` file:
```
SLACK_CLIENT_ID=1234567890abcdefg
SLACK_CLIENT_SECRET=09876544321qwerty
```
You will need to add a callback URL to your Slack app to allow Slack to redirect back to your Library instance after the user is authenticated.
