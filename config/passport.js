const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const configurePassport = () => {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Google OAuth
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        return done(null, user);
      }
      // Check if email already exists
      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        user.googleId = profile.id;
        if (!user.avatar && profile.photos[0]) {
          user.avatar = profile.photos[0].value;
        }
        await user.save();
        return done(null, user);
      }
      // Create new user
      user = await User.create({
        googleId: profile.id,
        username: profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 9999),
        email: profile.emails[0].value,
        avatar: profile.photos[0] ? profile.photos[0].value : null,
        isVerified: true,
        authMethod: 'google',
      });
      // Create default workspace
      const Workspace = require('../models/Workspace');
      await Workspace.create({
        user: user._id,
        name: 'My First Workspace',
        description: 'Your default workspace. Rename it anytime.',
        icon: 'layers',
        isDefault: true,
      });
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));

  // Local strategy
  passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        return done(null, false, { message: 'No account found with that email address.' });
      }
      if (user.authMethod === 'google') {
        return done(null, false, { message: 'This account uses Google sign-in. Please continue with Google.' });
      }
      if (!user.isVerified) {
        return done(null, false, { message: 'Please verify your email address before signing in.' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password. Please try again.' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
};

module.exports = { configurePassport };
