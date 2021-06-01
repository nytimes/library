const packageJson = require('../package.json')

const transforms = []
const scriptSrcs = []
const styleSrcs = []
const csps = []

Object.keys(packageJson.dependencies).forEach(depName => {
  if (depName.includes('library-plugin')) {
    console.log(`  🔌 Registering ${depName}`)
    const {transform, externalScripts = [], externalStyles = [], csp = {}} = require(depName)
    if (transform) {
      transforms.push(transform)
      console.log('   ↳ Registered transform function')
    }
    scriptSrcs.push(...externalScripts)
    console.log(`   ↳ Registered ${externalScripts.length} external scripts`)
    styleSrcs.push(...externalStyles)
    console.log(`   ↳ Registered ${externalStyles.length} external stylesheets`)
    csps.push(csp)
    console.log(`   ↳ Registered ${Object.keys(csp).length} csp header additions`)
  }
})

module.exports = {
  transforms,
  externalScripts: scriptSrcs,
  externalStyles: styleSrcs,
  csps
}
