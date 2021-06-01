const {csps} = require('./plugins')

const csp = {
  defaultSrc: ["'self'", ...csps.flatMap((csp) => csp.defaultSrc || [])],
  scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "*.google-analytics.com", ...csps.flatMap((csp) => csp.scriptSrc || [])],
  styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "maxcdn.bootstrapcdn.com", "*.googleusercontent.com", ...csps.flatMap((csp) => csp.styleSrc || [])],
  fontSrc: ["'self'", "fonts.gstatic.com", "maxcdn.bootstrapcdn.com", ...csps.flatMap((csp) => csp.fontSrc || [])],
  imgSrc: ["'self'", "data:", "*.googleusercontent.com", "*.google-analytics.com", ...csps.flatMap((csp) => csp.imgSrc || [])],
  frameSrc: ["'self'","data:","*.youtube.com", ...csps.flatMap((csp) => csp.iframeSrc || [])],
  objectSrc: ["'none'", ...csps.flatMap((csp) => csp.objectSrc || [])]
}

module.exports = csp
