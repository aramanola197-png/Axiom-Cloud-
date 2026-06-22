const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController'); // Adjust path if necessary
const { requireAuth, requireGuest } = require('../middleware/auth'); // Adjust path if necessary

// ==========================================
// SIGN IN ROUTES
// ==========================================
router.get('/signin', requireGuest, (req, res) => {
  res.render('auth/signin', { title: 'Sign In – Axiom Cloud' });
});

router.post('/signin', requireGuest, authLimiter, authController.signin);

// ==========================================
// SIGN UP ROUTES
// ==========================================
router.get('/signup', requireGuest, (req, res) => {
  res.render('auth/signup', { title: 'Get Started – Axiom Cloud' });
});

router.post('/signup', requireGuest, authLimiter, authController.signup);

// ==========================================
// GOOGLE OAUTH ROUTES
// ==========================================

// 1. Kick off the Google login handshake
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

// 2. Handle the response back from Google and go straight to Dashboard
router.get('/google/callback',
  passport.authenticate('google', { 
    successRedirect: '/dashboard',
    failureRedirect: '/auth/signin' 
  })
);

// ==========================================
// LOGOUT ROUTE
// ==========================================
router.post('/logout', requireAuth, (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });
});

module.exports = router;
