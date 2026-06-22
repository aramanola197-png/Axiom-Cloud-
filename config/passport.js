const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { sendVerificationEmail } = require('../utils/email');

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

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

  // ==========================================
  // GOOGLE OAUTH STRATEGY
  // ==========================================
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      proxy: true 
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1. Check if a user with this specific Google ID already exists
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          return done(null, user);
        }

        // 2. Check if the email address was already used for a local signup
        user = await User.findOne({ email: profile.emails[0].value.toLowerCase() });
        if (user) {
          user.googleId = profile.id;
          if (!user.avatar && profile.photos && profile.photos[0]) {
            user.avatar = profile.photos[0].value;
          }
          await user.save();
          return done(null, user);
        }

        // 3. Create a brand-new unverified user document
        const code = generateCode();
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        user = await User.create({
          googleId: profile.id,
          username: profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 9999),
          email: profile.emails[0].value.toLowerCase(),
          avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          isVerified: false, 
          authMethod: 'google',
          verificationCode: code,
          verificationExpires: expires
        });

        // 4. Dispatch the verification pin token via your Brevo SMTP server
        try {
          await sendVerificationEmail(user.email, user.username, code);
        } catch (emailError) {
          console.error('Google onboarding email dispatch failed. Executing rollback:', emailError);
          await User.findByIdAndDelete(user._id); 
          return done(emailError, null);
        }

        return done(null, user);
      } catch (err) {
        console.error('Google Strategy Error:', err);
        return done(err, null);
      }
    }
  ));

  // ==========================================
  // LOCAL STRATEGY
  // ==========================================
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
