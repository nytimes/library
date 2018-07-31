# Customizing Library

## The `custom` Directory

The `custom` directory mirrors the directory structure of `server`. For certain
files, overrides can be created to allow for custom implementations.
Custom middleware is also supported.

A `custom` directory using all overrides will have the following structure:
```
custom/
├── cache
│   └── store.js
├── middleware
│   ├── middleware1.js
│   └── middleware2.js
├── strings.yaml
├── styles
│   └── __theme.scss
└── userAuth.js
```

## Styles
Sass variable overrides can be placed in `custom/styles/__theme.scss`. This allows
for setting

## Text, Language, and Branding
The site name, logo, and most of the text on the website can be modified from the
`strings.yaml` file. Any value in `config/strings.yaml` can be overridden by
placing a value for the same key in `custom/strings.yaml`.

## Middleware
Middleware can be added to the beginning or end of the request cycle by placing
files into `custom/middleware`. These files can export `preload` and `postload`
functions. These functions must be valid middleware with params
`(res, req, next)`.

`preload` exports will be added to the beginning of the request cycle, while
`postload`


## Cache Client
By default, Library uses an in-memory cache. A custom cache client can be written
to used in its place.

A custom cache client can used by placing a `store.js` file in the `custom/cache`
directory. This file must export an object with the methods
- `set(key, value, callback)`, where `callback` takes `(err, success)`
- `get(key, callback)`, where `callback` takes `(err, value)`

## Authentication
By default, Library uses Google oAuth to authenticate users. Different authentication system or disabling authentication alltogether can be done by creating `custom/userAuth.js`.

This file must export an express router or middleware that contains all authentication
logic. The logic placed in this file are run early in the middleware chain, allowing
you to ensure a user is authenticated before they are able to access site content.
