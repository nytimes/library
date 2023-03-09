const messages = require('./messages')

// For now, this should just throw for things that would stop the app from booting.

module.exports = () => {
  const { errorMessages } = messages
  const { APPROVED_DOMAINS, DRIVE_TYPE, DRIVE_ID } = process.env
  const errors = []

  if (!APPROVED_DOMAINS) errors.push(errorMessages.noApprovedDomains)
  if (!DRIVE_TYPE) errors.push(errorMessages.noDriveType)
  if (!DRIVE_ID) errors.push(errorMessages.noDriveID)

  if (errors.length) {
    console.log('***********************************************')
    console.log('Your library instance has configuration issues:')
    errors.forEach((message) => console.error(`  > ${message}`))
    console.log('Address these issues and restart the app.')
    console.log('***********************************************')
    process.exit(1)
  }
}
