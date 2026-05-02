import { query } from '../db/index.js';
import { sendDailyPushForUser } from './notifications.js';

// Every 5 min the scheduler asks Postgres which users are currently in
// their 8–10am local window and haven't been notified today. CLAUDE.md
// rule: "Never send between 11pm and 7am" — the 8–10am window is well
// inside that envelope.
//
// Why every 5 min and not exactly 9am: Postgres timezone math + DST
// transitions are easier to handle as a sliding window than a precise
// per-user schedule, and 5 min granularity is more than enough for
// "morning" context.

const TICK_INTERVAL_MS = 5 * 60 * 1000;
let intervalHandle = null;

export function startNotificationScheduler() {
  if (intervalHandle) return; // idempotent — server.js can call freely
  if (process.env.NOTIFICATIONS_ENABLED !== 'true') {
    console.log('[notifications] scheduler disabled (set NOTIFICATIONS_ENABLED=true to start)');
    return;
  }
  console.log('[notifications] scheduler starting — checking every 5 min');
  // Run once immediately, then on the interval.
  tick().catch(err => console.error('[notifications] tick error:', err));
  intervalHandle = setInterval(() => {
    tick().catch(err => console.error('[notifications] tick error:', err));
  }, TICK_INTERVAL_MS);
}

export function stopNotificationScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

/**
 * One pass through eligible users. Find users where:
 *   - their local hour is 8 or 9 (target morning window)
 *   - they haven't been notified today (last_notified_at::date < today_local)
 *   - they have at least one active item AND at least one fcm_token
 */
async function tick() {
  const candidates = await query(`
    SELECT u.id, u.timezone, u.fridge_temp_setting
    FROM users u
    WHERE EXTRACT(HOUR FROM NOW() AT TIME ZONE u.timezone) BETWEEN 8 AND 9
      AND (
        u.last_notified_at IS NULL
        OR (u.last_notified_at AT TIME ZONE u.timezone)::date < (NOW() AT TIME ZONE u.timezone)::date
      )
      AND EXISTS (SELECT 1 FROM fcm_tokens t WHERE t.user_id = u.id)
      AND EXISTS (SELECT 1 FROM items i WHERE i.user_id = u.id AND i.status = 'active')
  `);

  if (candidates.rows.length === 0) return;
  console.log(`[notifications] tick — ${candidates.rows.length} user(s) in window`);

  for (const user of candidates.rows) {
    try {
      const r = await sendDailyPushForUser(user);
      if (r.sent) console.log(`[notifications] sent to ${user.id}: ${r.action}`);
      else        console.log(`[notifications] skip ${user.id}: ${r.reason}`);
    } catch (err) {
      console.error(`[notifications] error for ${user.id}:`, err.message);
    }
  }
}
