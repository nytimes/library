'use strict'

const express = require('express')
const passport = require('passport')
const session = require('express-session')
const md5 = require('md5')
const {Strategy} = require('passport-google-oauth2')

const config = require('./utils').getConfig()

const router = express.Router()

module.exports = router

passport.use(new Strategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/redirect',
  passReqToCallback: true
}, (request, accessToken, refreshToken, profile, done) => done(null, profile)))

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

// use the badcom callback path for ease of setup
router.get('/auth/redirect',
  passport.authenticate('google', { failureRedirect: '/login', successRedirect: '/' })
)

router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') next()
  let authenticated = req.isAuthenticated()
  if (authenticated) {
    const domains = process.env.APPROVED_DOMAINS.split(/,\s?/g)
    try {
      authenticated = domains.includes(req.session.passport.user._json.domain)
      setUserInfo(req)
    } catch (e) {
      console.log('User does not have an approved email address')
      res.redirect('/login')
    }
    if (authenticated) {
      return next()
    }
  }
  console.log('User not authenticated')
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
  req.userInfo = {
    email: req.session.passport.user.emails[0].value,
    photo: req.session.passport.user.photos[0].value,
    userId: req.session.passport.user.id,
    analyticsUserId: md5(req.session.passport.user.id + 'library')
  }
}
