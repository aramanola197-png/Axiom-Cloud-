const express = require('express');
const router = express.Router();
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { requireGuest, requireAuth } = require('../middleware/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many attempts. Please wait 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Sign In
router.get('/signin', requireGuest, (req, res) => {
  res.render('auth/signin', { title: 'Sign In — Axiom Cloud', error: null });
});
router.post('/signin', requireGuest, authLimiter, authController.signin);

// Sign Up
router.get('/signup', requireGuest, (req, res) => {
  res.render('auth/signup', { title: 'Get Started — Axiom Cloud', error: null });
});
router.post('/signup', requireGuest, authLimiter, authController.signup);

// Verify Email
router.get('/verify', (req, res) => {
  const email = req.session.pendingEmail;
  if (!email) return res.redirect('/auth/signup');
  res.render('auth/verify', { title: 'Verify Your Email — Axiom Cloud', email, error: null });
});
router.post('/verify', authLimiter, authController.verify);
router.post('/resend-code', authLimiter, authController.resendCode);

// Google OAuth
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/signin' }),
  (req, res, next) => {
    // Check if this Google user account requires email validation
    if (!req.user.isVerified) {
      // 1. Stage the target email for the /auth/verify verification template
      req.session.pendingEmail = req.user.email;

      // 2. Terminate the active session to protect the /dashboard route layout
      req.logout((err) => {
        if (err) return next(err);
        
        // 3. Route them directly to the 6-digit token entry form
        return res.redirect('/auth/verify');
      });
    } else {
      // Existing verified user: pass them straight through to their workspace
      const returnTo = req.session.returnTo || '/dashboard';
      delete req.session.returnTo;
      res.redirect(returnTo);
    }
  }
);


// Logout
router.post('/logout', requireAuth, (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });
});

module.exports = router;
