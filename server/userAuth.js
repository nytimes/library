'use strict'

const passport = require('passport')
const session = require('express-session')
const crypto = require('crypto')
const GoogleStrategy = require('passport-google-oauth20')
const SlackStrategy = require('passport-slack-oauth2').Strategy
const samlStrategy = require('passport-saml').Strategy

const log = require('./logger')
const {stringTemplate: template, formatUrl} = require('./utils')

const router = require('express-promise-router')()
const domains = new Set(process.env.APPROVED_DOMAINS.split(/,\s?/g))

const authStrategies = ['google', 'Slack', 'saml']
let authStrategy = process.env.OAUTH_STRATEGY

const callbackURL = process.env.REDIRECT_URL || formatUrl('/auth/redirect')
if (!authStrategies.includes(authStrategy)) {
  log.warn(`Invalid oauth strategy ${authStrategy} specific, defaulting to google auth`)
  authStrategy = 'google'
}

const isSlackOauth = authStrategy === 'Slack'
const isSamlAuth = authStrategy === 'saml'
if (isSlackOauth) {
  passport.use(new SlackStrategy({
    clientID: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    skipUserProfile: false,
    callbackURL,
    scope: ['identity.basic', 'identity.email', 'identity.avatar', 'identity.team', 'identity.email']
  },
  (accessToken, refreshToken, profile, done) => {
    // optionally persist user data into a database
    done(null, profile)
  }
  ))
} else if (isSamlAuth) {
  passport.use(new samlStrategy({
    callbackUrl: callbackURL,
    entryPoint: process.env.SAML_ENTRYPOINT_URL,
    issuer: process.env.SAML_CERT_ISSUER,
    cert: process.env.SAML_CERTIFICATE,
    privateKey: process.env.SAML_PRIVATE_KEY,
    decryptionPvk: process.env.SAML_DECRYPTION_PRIVATE_KEY,
    wantAssertionsSigned: true,
    metadataOrganization: {
      OrganizationName: {'#text': process.env.SAML_ORG_NAME},
      OrganizationDisplayName: {'#text': process.env.SAML_ORG_DISPLAY_NAME},
      OrganizationURL: {'#text': process.env.SAML_ORG_URL}
    },
    metadataContactPerson: [{
      '@contactType': 'support',
      GivenName: process.env.SAML_CONTACT_NAME,
      EmailAddress: process.env.SAML_CONTACT_EMAIL
    }]
  },
  (profile, done) => done(null, profile)))
} else {
  // default to google auth
  passport.use(new GoogleStrategy.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL,
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    passReqToCallback: true
  }, (request, accessToken, refreshToken, profile, done) => done(null, profile)))
}

const md5 = (data) => crypto.createHash('md5').update(data).digest('hex')

router.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true
}))

router.use(passport.initialize())
router.use(passport.session())

// seralize/deseralization methods for extracting user information from the
// session cookie and adding it to the req.passport object
passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((obj, done) => done(null, obj))

const googleLoginOptions = {
  scope: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ],
  prompt: 'select_account'
}

router.get('/login', passport.authenticate(authStrategy, isSlackOauth || isTouchstoneSamlAuth ? {} : googleLoginOptions))

router.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/')
})

router.get('/auth/redirect', passport.authenticate(authStrategy, {failureRedirect: formatUrl('/login')}), (req, res) => {
  res.redirect(req.session.authRedirect || formatUrl('/'))
})

router.get('/metadata', function (req, res) {
  if (isSamlAuth) {
    res.type('application/xml')
    res.send((samlStrategy.generateServiceProviderMetadata(
      process.env.SAML_MD_DECRYPTION_CERT,
      process.env.SAML_MD_SIGNING_CERT
    )))
  } else {
    res.redirect(formatUrl('/'))
  }
})

router.use((req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development'
  const passportUser = (req.session.passport || {}).user || {}
  if (isDev || (req.isAuthenticated() && isAuthorized(passportUser))) {
    setUserInfo(req)
    return next()
  }

  if (req.isAuthenticated() && !isAuthorized(passportUser)) {
    return next(Error('Unauthorized'))
  }

  log.info('User not authenticated')
  req.session.authRedirect = formatUrl(req.path)
  res.redirect(formatUrl('/login'))
})

function isAuthorized(user) {
  const [{value: userEmail = ''} = {}] = user.emails || []
  const [userDomain] = userEmail.split('@').slice(-1)
  const checkRegexEmail = () => {
    const domainsArray = Array.from(domains)
    for (const domain of domainsArray) {
      if (userDomain.match(domain)) return true
    }
  }
  return domains.has(userDomain) || domains.has(userEmail) || checkRegexEmail()
}

function setUserInfo(req) {
  if (process.env.NODE_ENV === 'development') {
    req.userInfo = {
      email: process.env.TEST_EMAIL || template('footer.defaultEmail'),
      userId: '10',
      analyticsUserId: md5('10library')
    }
    return
  }
  const email = isSlackOauth || isSamlAuth ? req.session.passport.user.email : req.session.passport.user.emails[0].value
  req.userInfo = req.userInfo ? req.userInfo : {
    userId: req.session.passport.user.id,
    analyticsUserId: md5(req.session.passport.user.id + 'library'),
    email
  }
}

module.exports = router
