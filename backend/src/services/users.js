import { query } from '../db/index.js';

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export async function getMe(user) {
  const r = await query(
    `SELECT id, email, fridge_temp_setting, onboarded_at, created_at, updated_at
     FROM users WHERE id = $1`,
    [user.id]
  );
  return r.rows[0] || null;
}

/**
 * PATCH /api/users/me
 * Accepts:
 *   { fridge_temp_setting: 32–50 (integer °F) }
 *   { onboarded: true }   ← sets onboarded_at = NOW() (one-shot)
 */
export async function updateMe(user, body) {
  const sets = [];
  const params = [];

  if (body.fridge_temp_setting !== undefined) {
    const t = body.fridge_temp_setting;
    if (!Number.isInteger(t) || t < 32 || t > 50) {
      throw httpError(400, 'invalid_fridge_temp', 'fridge_temp_setting must be integer °F between 32 and 50');
    }
    params.push(t);
    sets.push(`fridge_temp_setting = $${params.length}`);
  }

  if (body.onboarded === true) {
    sets.push(`onboarded_at = COALESCE(onboarded_at, NOW())`);
  }

  if (sets.length === 0) {
    throw httpError(400, 'no_fields', 'no updatable fields provided');
  }

  params.push(user.id);
  const sql = `
    UPDATE users SET ${sets.join(', ')}
    WHERE id = $${params.length}
    RETURNING id, email, fridge_temp_setting, onboarded_at, created_at, updated_at
  `;
  const r = await query(sql, params);
  return r.rows[0];
}
