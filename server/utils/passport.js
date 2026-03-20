import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from './db.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      const { id, emails, displayName, photos } = profile;
      const email = emails[0].value;
      const picture = photos && photos.length > 0 ? photos[0].value : null;

      try {
        // Check if user exists by google_id or email
        let user = await pool.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [id, email]);

        if (user.rows.length === 0) {
          // Create new user
          user = await pool.query(
            'INSERT INTO users (name, email, google_id, auth_provider, picture) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, picture',
            [displayName, email, id, 'google', picture]
          );
        } else {
          // Link google_id or update picture if needed
          user = await pool.query(
            'UPDATE users SET google_id = $1, auth_provider = $2, picture = $3 WHERE email = $4 RETURNING id, name, email, picture',
            [id, 'google', picture, email]
          );
        }
        return done(null, user.rows[0]);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// We don't really need session-based passport if we use JWT cookies, 
// but passport requires these if we use passport.authenticate('google')
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, user.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
