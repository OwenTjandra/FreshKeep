import { query } from '../db/index.js';
import { computeRecommendedAction } from './expirationIntelligence.js';

// firebase-admin is loaded lazily so the backend boots even when it isn't
// installed (it's an optionalDependency). When the service account isn't
// configured, sends are no-ops with a clear log line — useful for dev.
let _admin = null;
let _adminInitialized = false;

async function getAdmin() {
  if (_adminInitialized) return _admin;
  _adminInitialized = true;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    console.log('[notifications] FIREBASE_SERVICE_ACCOUNT_PATH not set — sends are no-ops');
    return null;
  }
  try {
    const mod = await import('firebase-admin');
    const adminLib = mod.default;
    const fs = await import('node:fs/promises');
    const credJson = JSON.parse(await fs.readFile(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
    if (adminLib.apps.length === 0) {
      adminLib.initializeApp({ credential: adminLib.credential.cert(credJson) });
    }
    _admin = adminLib;
    return _admin;
  } catch (e) {
    console.warn('[notifications] firebase-admin unavailable:', e.message);
    return null;
  }
}

// ───────────────────────────────────────────────────────────
// Token registration
// ───────────────────────────────────────────────────────────

export async function registerToken(user, token, deviceLabel) {
  if (typeof token !== 'string' || !token.trim()) {
    const err = new Error('token is required');
    err.status = 400;
    throw err;
  }
  await query(`
    INSERT INTO fcm_tokens (user_id, token, device_label, last_seen_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id, token) DO UPDATE
      SET device_label = COALESCE(EXCLUDED.device_label, fcm_tokens.device_label),
          last_seen_at = NOW()
  `, [user.id, token.trim(), deviceLabel || null]);
}

// ───────────────────────────────────────────────────────────
// Message templating — contextual per CLAUDE.md
// "you haven't opened that yogurt yet and it expires tomorrow —
//  have it for breakfast!" not "X expires in 3 days".
// ───────────────────────────────────────────────────────────

export function messageForItem(item) {
  const a = item.recommended_action;
  if (!a || a === 'safe' || a === 'monitor') return null;

  const name = item.name;
  const days = item.days_until_expiry;

  switch (a) {
    case 'eat_now': {
      // Contextual: unopened breakfast-friendly items get a breakfast nudge
      if (item.opened === false && BREAKFAST_FRIENDLY.has(item.category)) {
        return {
          title: '🥣 Open it for breakfast',
          body: `You haven't opened that ${name} yet — it expires today. Have it for breakfast?`,
        };
      }
      return {
        title: `🍴 ${name} expires today`,
        body: 'Tap for a recipe with what you have.',
      };
    }
    case 'use_in_recipe':
      return {
        title: `🍳 Cook your ${name} tonight`,
        body: days <= 1 ? 'Expires today — tap for a recipe.' : 'Use it in a recipe before it goes.',
      };
    case 'freeze_now':
      return {
        title: `🧊 Freeze your ${name}`,
        body: 'Save it for later — tap to mark frozen.',
      };
    case 'eat_soon':
      return {
        title: `${name} expires soon`,
        body: days <= 3 ? `Use within ${days} day${days === 1 ? '' : 's'}.` : 'Use this week.',
      };
    case 'compost':
      return {
        title: `${name} is past its date`,
        body: 'Check it carefully — or toss it.',
      };
    default:
      return null;
  }
}

const BREAKFAST_FRIENDLY = new Set([
  'dairy_yogurt', 'dairy_milk', 'eggs', 'bread', 'produce_berries', 'produce_soft_fruit',
]);

// ───────────────────────────────────────────────────────────
// Sending
// ───────────────────────────────────────────────────────────

/**
 * Send the highest-priority push to a user. Returns:
 *   { sent: true, item_id, action }   on success or stubbed-no-op
 *   { sent: false, reason }           when there's nothing to send
 */
export async function sendDailyPushForUser(user, opts = {}) {
  const itemsRes = await query(`
    SELECT i.*, (i.expiry_date - CURRENT_DATE) AS days_until_expiry, slr.freezable AS freezable
    FROM items i
    LEFT JOIN shelf_life_reference slr
      ON slr.category = i.category AND slr.location = i.location AND slr.opened = i.opened
    WHERE i.user_id = $1 AND i.status = 'active'
  `, [user.id]);

  // Run the engine over each, sort by priority, take the most urgent that warrants a push.
  const ranked = itemsRes.rows
    .map(row => ({ ...row, engine: computeRecommendedAction({ ...row, expiry_date: String(row.expiry_date) }, user) }))
    .filter(r => r.engine && r.engine.action !== 'safe' && r.engine.action !== 'monitor')
    .sort((a, b) => a.engine.priority - b.engine.priority || a.days_until_expiry - b.days_until_expiry);

  if (ranked.length === 0) {
    return { sent: false, reason: 'nothing_to_say' };
  }

  const top = ranked[0];
  const message = messageForItem({
    ...top,
    recommended_action: top.engine.action,
    action_priority: top.engine.priority,
    action_reason: top.engine.reason,
  });
  if (!message) return { sent: false, reason: 'no_message_template' };

  const tokensRes = await query('SELECT token FROM fcm_tokens WHERE user_id = $1', [user.id]);
  const tokens = tokensRes.rows.map(r => r.token);
  if (tokens.length === 0) {
    console.log(`[notifications] user ${user.id} has no tokens — skipping`);
    return { sent: false, reason: 'no_tokens' };
  }

  const admin = await getAdmin();
  if (!admin) {
    console.log(`[notifications] STUB → ${tokens.length} token(s) for ${user.id}: ${message.title} | ${message.body}`);
  } else {
    try {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title: message.title, body: message.body },
        data: { item_id: top.id, action: top.engine.action, deep_link: `freshkeep://item/${top.id}` },
      });
    } catch (e) {
      console.error('[notifications] FCM send failed:', e.message);
      return { sent: false, reason: 'send_failed', error: e.message };
    }
  }

  if (!opts.dryRun) {
    await query('UPDATE users SET last_notified_at = NOW() WHERE id = $1', [user.id]);
  }
  return { sent: true, item_id: top.id, action: top.engine.action, message };
}
