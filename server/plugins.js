const packageJson = require('../package.json')

const transforms = []
const scriptSrcs = []
const csps = []

Object.keys(packageJson.dependencies).forEach(depName => {
  if (depName.includes('library-plugin')) {
    console.log('>>', depName)
    const {transform, externalScripts, csp} = require(depName)
    transforms.push(transform)
    scriptSrcs.push(...externalScripts)
    csps.push(csp)
  }
})

console.log(csps)
module.exports = {
  transforms,
  externalScripts: scriptSrcs,
  csps
}
