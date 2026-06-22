const express = require('express');
const router = express.Router();
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { requireAuth, requireGuest } = require('../middleware/auth');

// ==========================================
// RATE LIMITER CONFIGURATION
// ==========================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per window
  message: 'Too many attempts from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// SIGN IN ROUTES
// ==========================================
router.get('/signin', requireGuest, (req, res) => {
  // Pass error: null so EJS doesn't crash on initial load
  res.render('auth/signin', { title: 'Sign In – Axiom Cloud', error: null });
});

router.post('/signin', requireGuest, authLimiter, authController.signin);

// ==========================================
// SIGN UP ROUTES
// ==========================================
router.get('/signup', requireGuest, (req, res) => {
  // Pass error: null so EJS doesn't crash on initial load
  res.render('auth/signup', { title: 'Get Started – Axiom Cloud', error: null });
});

router.post('/signup', requireGuest, authLimiter, authController.signup);

// ==========================================
// GOOGLE OAUTH ROUTES
// ==========================================
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

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
