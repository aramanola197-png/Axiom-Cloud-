const passport = require('passport');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { sendVerificationEmail, sendWelcomeEmail } = require('../utils/email');
const crypto = require('crypto');

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.signin = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.render('auth/signin', {
        title: 'Sign In — Axiom Cloud',
        error: info?.message || 'Something went wrong. Please try again.',
      });
    }
    req.logIn(user, async (err) => {
      if (err) return next(err);
      user.lastActive = new Date();
      await user.save();
      const returnTo = req.session.returnTo || '/dashboard';
      delete req.session.returnTo;
      res.redirect(returnTo);
    });
  })(req, res, next);
};

exports.signup = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.render('auth/signup', { title: 'Get Started — Axiom Cloud', error: 'All fields are required.' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.render('auth/signup', { title: 'Get Started — Axiom Cloud', error: 'Username must be between 3 and 30 characters.' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.render('auth/signup', { title: 'Get Started — Axiom Cloud', error: 'Username can only contain letters, numbers, and underscores.' });
    }
    if (password.length < 8) {
      return res.render('auth/signup', { title: 'Get Started — Axiom Cloud', error: 'Password must be at least 8 characters.' });
    }
    if (password !== confirmPassword) {
      return res.render('auth/signup', { title: 'Get Started — Axiom Cloud', error: 'Passwords do not match.' });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.render('auth/signup', { title: 'Get Started — Axiom Cloud', error: 'An account with this email already exists.' });
    }
    const existingUsername = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (existingUsername) {
      return res.render('auth/signup', { title: 'Get Started — Axiom Cloud', error: 'This username is already taken.' });
    }

    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
      verificationCode: code,
      verificationExpires: expires,
      authMethod: 'local',
      isVerified: false,
    });

    await sendVerificationEmail(user.email, user.username, code);

    req.session.pendingEmail = user.email;
    res.redirect('/auth/verify');
  } catch (err) {
    console.error('Signup error:', err);
    res.render('auth/signup', { title: 'Get Started — Axiom Cloud', error: 'Something went wrong. Please try again.' });
  }
};

exports.verify = async (req, res) => {
  try {
    const email = req.session.pendingEmail;
    if (!email) return res.redirect('/auth/signup');

    const code = (req.body.code || '').trim();
    if (!code || code.length !== 6) {
      return res.render('auth/verify', { title: 'Verify Your Email — Axiom Cloud', email, error: 'Please enter the complete 6-digit code.' });
    }

    const user = await User.findOne({ email }).select('+verificationCode +verificationExpires');
    if (!user) return res.redirect('/auth/signup');

    if (user.verificationExpires < new Date()) {
      return res.render('auth/verify', { title: 'Verify Your Email — Axiom Cloud', email, error: 'Your verification code has expired. Please request a new one.' });
    }

    if (user.verificationCode !== code) {
      return res.render('auth/verify', { title: 'Verify Your Email — Axiom Cloud', email, error: 'incorrect_code' });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    await user.save();

    // Create default workspace
    await Workspace.create({
      user: user._id,
      name: 'My First Workspace',
      description: 'Your default workspace. Rename it anytime.',
      icon: 'layers',
      isDefault: true,
    });

    await sendWelcomeEmail(user.email, user.username);

    delete req.session.pendingEmail;
    req.logIn(user, (err) => {
      if (err) return res.redirect('/auth/signin');
      res.redirect('/dashboard?welcome=1');
    });
  } catch (err) {
    console.error('Verify error:', err);
    const email = req.session.pendingEmail;
    res.render('auth/verify', { title: 'Verify Your Email — Axiom Cloud', email, error: 'Something went wrong. Please try again.' });
  }
};

exports.resendCode = async (req, res) => {
  try {
    const email = req.session.pendingEmail;
    if (!email) return res.json({ success: false, message: 'Session expired. Please sign up again.' });

    const user = await User.findOne({ email }).select('+verificationCode +verificationExpires');
    if (!user) return res.json({ success: false, message: 'Account not found.' });
    if (user.isVerified) return res.json({ success: false, message: 'This account is already verified.' });

    const code = generateCode();
    user.verificationCode = code;
    user.verificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(user.email, user.username, code);
    res.json({ success: true, message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to resend code. Please try again.' });
  }
};
