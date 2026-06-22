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

  // ==========================================
  // GOOGLE OAUTH STRATEGY (Auto-Verified)
  // ==========================================
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      proxy: true // Ensures secure cookie passing over Render hosting environment
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1. Check if user profile with this specific Google ID already exists
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          return done(null, user);
        }

        // 2. Check if email was already used for a local registration
        const targetEmail = profile.emails[0].value.toLowerCase();
        user = await User.findOne({ email: targetEmail });
        if (user) {
          // Link Google credentials directly to existing account
          user.googleId = profile.id;
          if (!user.avatar && profile.photos && profile.photos[0]) {
            user.avatar = profile.photos[0].value;
          }
          user.isVerified = true; // Auto-verify linked account
          await user.save();
          return done(null, user);
        }

        // 3. Create a brand-new user profile with instant access clearance
        user = await User.create({
          googleId: profile.id,
          username: profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 9999),
          email: targetEmail,
          avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          isVerified: true, // 👈 Handshake auto-approves account confirmation
          authMethod: 'google'
        });

        console.log(`New Google user registered and auto-verified: ${user.email}`);
        return done(null, user);
      } catch (err) {
        console.error('Google Strategy Internal Exception:', err);
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

      // 💡 NOTE: The strict verification check has been removed here to open local accounts instantly

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
