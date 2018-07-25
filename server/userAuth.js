'use strict'

const express = require('express')
const passport = require('passport')
const session = require('express-session')
const md5 = require('md5')
const GoogleStrategy = require('passport-google-oauth2')

const log = require('./logger')
const {stringTemplate: template} = require('./utils')

const router = express.Router()
const domains = new Set(process.env.APPROVED_DOMAINS.split(/,\s?/g))

passport.use(new GoogleStrategy.Strategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/redirect',
  passReqToCallback: true
}, (request, accessToken, refreshToken, profile, done) => done(null, profile)))

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

router.get('/login', passport.authenticate('google', {
  scope: [
    'https://www.googleapis.com/auth/plus.profile.emails.read',
    'https://www.googleapis.com/auth/userinfo.profile'
  ]
}), (req, res) => {
  console.log('in login')
})

router.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/')
})

router.get('/auth/redirect', passport.authenticate('google'), (req, res) => {
  console.log('hit auth redirect', req.session.authRedirect)
  res.redirect(req.session.authRedirect || '/')
})

router.use((req, res, next) => {
  console.log('hit middleware', req.originalUrl)
  const isDev = process.env.NODE_ENV === 'development'
  const authenticated = req.isAuthenticated()

  if (isDev || (authenticated && domains.has(req.session.passport.user._json.domain))) {
    setUserInfo(req)
    return next()
  }

  if (authenticated && !domains.has(req.session.passport.user._json.domain)) {
    res.status(403).render('errors/domain', {template})
    return
  }

  log.info('User not authenticated')
  req.session.authRedirect = req.path
  res.redirect('/login')
})

function setUserInfo(req) {
  if (process.env.NODE_ENV === 'development') {
    req.userInfo = {
      email: process.env.TEST_EMAIL || template('footer.defaultEmail'),
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
