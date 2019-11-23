const messages = require('./messages')

const isDev = process.env.NODE_ENV === 'development'

module.exports = () => {
  const {envMessages} = messages
  const { APPROVED_DOMAINS, DRIVE_TYPE, DRIVE_ID } = process.env
  const errors = []

  if (!APPROVED_DOMAINS) errors.push(envMessages.noApprovedDomains)
  if (!DRIVE_TYPE) errors.push(envMessages.noDriveType)
  if (!DRIVE_ID) errors.push(envMessages.noDriveID)

  if (errors.length) {
    console.log('***********************************************')
    console.log('Your library instance has configuration issues:')
    errors.forEach((message) => console.error(`  > ${message}`))
    console.log('Address these issues and restart the app.')
    console.log('***********************************************')
    process.exit(1)
  }
}
