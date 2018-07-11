# Customizing Library

Eventually this will be a nice guide but for now it's going to be my scratchpad!

## Custom Middleware
Middleware can be added to the beginning or end of the request cycle by placing
`*.preload.js` and `*.postload.js` files into `custom/middleware`.

Must export middleware with params `(res, req, next)`, and must fail gracefully.

Currently looks like ordering is alphabetical.

## Custom Cache Client
Cache by default is handled with an in-memory Redis store. Set env variables
`REDIS_URI` and `REDIS_PASS` to appropriate values if you wish to use redis.

A custom cache client can used by placing a `cache.js` file in the `custom`
directory. This file must export an object with the methods
- `set(key, value, callback)`, where `callback` takes `(err, success)`
- `get(key, callback)`, where `callback` takes `(err, value)`
