const passport = require('passport');
const User = require('../models/User');
const Workspace = require('../models/Workspace');

// ==========================================
// SIGN IN CONTROLLER
// ==========================================
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

// ==========================================
// SIGN UP CONTROLLER (Auto-Verified)
// ==========================================
exports.signup = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // 1. Strict Input Validations
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

    // 2. Uniqueness Checks
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.render('auth/signup', { title: 'Get Started — Axiom Cloud', error: 'An account with this email already exists.' });
    }
    const existingUsername = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (existingUsername) {
      return res.render('auth/signup', { title: 'Get Started — Axiom Cloud', error: 'This username is already taken.' });
    }

    // 3. Document Creation (Set to verified instantly)
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
      authMethod: 'local',
      isVerified: true, // 👈 Bypasses verification gate
    });

    // 4. Provision Default Workspace (Moved directly into signup phase)
    await Workspace.create({
      user: user._id,
      name: 'My First Workspace',
      description: 'Your default workspace. Rename it anytime.',
      icon: 'layers',
      isDefault: true,
    });

    console.log(`New local user registered and auto-verified: ${user.email}`);

    // 5. Establish Passport login session automatically
    req.logIn(user, (err) => {
      if (err) {
        console.error('Auto-login redirection exception:', err);
        return res.redirect('/auth/signin');
      }
      // Drop them cleanly straight into their workspace setup!
      res.redirect('/dashboard?welcome=1');
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.render('auth/signup', { title: 'Get Started — Axiom Cloud', error: 'Something went wrong. Please try again.' });
  }
};
