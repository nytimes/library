'use strict'

const passport = require('passport')
const session = require('express-session')
const md5 = require('md5')
const GoogleStrategy = require('passport-google-oauth2')

const log = require('./logger')
const config = require('./utils').getConfig()

const router = require('express-promise-router')()
const domains = new Set(process.env.APPROVED_DOMAINS.split(/,\s?/g))

passport.use(new GoogleStrategy.Strategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/redirect',
  passReqToCallback: true
}, (request, accessToken, refreshToken, profile, done) => done(null, profile)))

// seralize/deseralization methods for extracting user information from the
// session cookie and adding it to the req.passport object
passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((obj, done) => done(null, obj))

router.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true
}))

router.use(passport.initialize())
router.use(passport.session())

router.get('/login', passport.authenticate('google', {
  scope: [
    'https://www.googleapis.com/auth/plus.profile.emails.read',
    'https://www.googleapis.com/auth/userinfo.profile'
  ]
}))

router.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/')
})

router.get('/auth/redirect', passport.authenticate('google'), (req, res) => {
  res.redirect(req.session.authRedirect || '/')
})

router.use((req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development'
  const authenticated = req.isAuthenticated()
  if (isDev || (authenticated && domains.has(req.session.passport.user._json.domain))) {
    setUserInfo(req)
    return next()
  }
  log.info('User not authenticated')
  req.session.authRedirect = req.path
  res.redirect('/login')
})

function setUserInfo(req) {
  if (process.env.NODE_ENV === 'development') {
    req.userInfo = {
      email: process.env.TEST_EMAIL || config.footer.defaultEmail,
      userId: '10',
      analyticsUserId: md5('10library')
    }
    return
  }
  req.userInfo = req.userInfo ? req.userInfo : {
    email: req.session.passport.user.emails[0].value,
    userId: req.session.passport.user.id,
    analyticsUserId: md5(req.session.passport.user.id + 'library')
  }
}

module.exports = router
