// eslint-disable-next-line no-undef
const GoogleAuth = jest.createMockFromModule('google-auth-library')

// eslint-disable-next-line no-undef
const getClient = async function () {
  return new Promise((resolve) => {
    return resolve(
      {
        access_token:
          '1/fFAGRNJru1FTz70BzhT3Zg',
        expires_in:
          3920,
        token_type:
          'Bearer',
        email: 'some email',
        key: 'some key value'
      })
  })
}

GoogleAuth.GoogleAuth.prototype.getClient = getClient
module.exports = GoogleAuth
