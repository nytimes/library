# Customizing Library

Eventually this will be a nice guide but for now it's going to be my scratchpad!

## Custom Middleware
Middleware can be added to the beginning or end of the request cycle by placing
files into `custom/middleware`. These files can export `preload` and `postload`
functions. These functions must be valid middleware with params
`(res, req, next)`.

`preload` exports will be added to the beginning of the request cycle, while
`postload`

## Custom Cache Client
<!--  FIXME THIS GOING TO BE WRONG -->
Cache by default is in-memory. If you provide the env variables
`REDIS_URI` and `REDIS_PASS` to appropriate values, redis will be used.

A custom cache client can used by placing a `store.js` file in the `custom/cache`
directory. This file must export an object with the methods
- `set(key, value, callback)`, where `callback` takes `(err, success)`
- `get(key, callback)`, where `callback` takes `(err, value)`
