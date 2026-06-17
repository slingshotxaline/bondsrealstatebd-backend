const passport      = require('passport');
const User = require('../models/User');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email  = profile.emails?.[0]?.value;
      const avatar = profile.photos?.[0]?.value;

      if (!email) return done(new Error('No email from Google'), null);

      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        // Update avatar if changed
        if (avatar && user.avatar !== avatar) {
          user.avatar = avatar;
          await user.save();
        }
        return done(null, user);
      }

      // Check if email already registered (local account) — link them
      user = await User.findOne({ email });
      if (user) {
        user.googleId     = profile.id;
        user.authProvider = 'google';
        if (avatar && !user.avatar) user.avatar = avatar;
        await user.save();
        return done(null, user);
      }

      // Create new user via Google
      user = await User.create({
        name:         profile.displayName || email.split('@')[0],
        email,
        googleId:     profile.id,
        avatar,
        authProvider: 'google',
        status:       'active',
      });

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;