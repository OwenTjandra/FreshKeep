import { query } from '../db/index.js';

// Dev-only auth shim: every request acts as the seeded demo user.
// Real authentication arrives in a later step (not in the current plan).
//
// If the demo user doesn't exist yet, returns 503 with a friendly hint
// to run the seed.

const DEMO_EMAIL = 'demo@freshkeep.app';

let cachedUser = null;

export async function devUser(req, res, next) {
  try {
    if (!cachedUser) {
      const r = await query(
        'SELECT id, email, fridge_temp_setting FROM users WHERE email = $1',
        [DEMO_EMAIL]
      );
      if (!r.rows.length) {
        return res.status(503).json({
          error: 'demo_user_missing',
          message: 'Run `npm run seed` to create the demo user.',
        });
      }
      cachedUser = r.rows[0];
    }
    req.user = cachedUser;
    next();
  } catch (err) {
    next(err);
  }
}
