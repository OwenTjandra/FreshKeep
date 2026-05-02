import { query } from '../db/index.js';
import { computeRecommendedAction } from './expirationIntelligence.js';

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

const VALID_LOCATIONS = ['fridge', 'freezer', 'counter', 'pantry'];
const VALID_STATUSES = ['active', 'used', 'tossed', 'pending'];

// Common SELECT — joins shelf_life_reference so items carry `freezable`
// (used by the engine and by UI buttons like "Mark frozen").
const ITEM_SELECT = `
  SELECT i.*,
         (i.expiry_date - CURRENT_DATE) AS days_until_expiry,
         slr.freezable AS freezable
  FROM items i
  LEFT JOIN shelf_life_reference slr
    ON slr.category = i.category
   AND slr.location = i.location
   AND slr.opened   = i.opened
`;

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function toIsoDateString(d) {
  if (typeof d === 'string') return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d;
}

/**
 * Add derived fields:
 *   - days_until_expiry  (computed in SQL when listing; passed through here)
 *   - recommended_action (string from engine, e.g. 'eat_now') | null
 *   - action_priority    1–5 | null
 *   - action_reason      short UI string | null
 *   - expiry_date        normalized to "YYYY-MM-DD"
 *
 * The engine returns {action, priority, reason}; we splat those onto the
 * item as flat fields so the frontend can treat them like any other column.
 */
function enrich(row, user) {
  const enriched = {
    ...row,
    expiry_date: toIsoDateString(row.expiry_date),
  };
  const out = computeRecommendedAction(enriched, user);
  enriched.recommended_action = out?.action ?? null;
  enriched.action_priority    = out?.priority ?? null;
  enriched.action_reason      = out?.reason ?? null;
  return enriched;
}

// ───────────────────────────────────────────────────────────
// Validation
// ───────────────────────────────────────────────────────────

function validateForCreate(body) {
  const { name, expiry_date, location, opened } = body;

  if (typeof name !== 'string' || !name.trim()) {
    throw httpError(400, 'invalid_name', 'name (non-empty string) is required');
  }
  if (typeof expiry_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expiry_date)) {
    throw httpError(400, 'invalid_expiry_date', 'expiry_date (YYYY-MM-DD) is required');
  }
  if (location !== undefined && !VALID_LOCATIONS.includes(location)) {
    throw httpError(400, 'invalid_location', `location must be one of: ${VALID_LOCATIONS.join(', ')}`);
  }
  if (opened !== undefined && typeof opened !== 'boolean') {
    throw httpError(400, 'invalid_opened', 'opened must be a boolean');
  }
  if (body.quantity !== undefined && (!Number.isInteger(body.quantity) || body.quantity < 1)) {
    throw httpError(400, 'invalid_quantity', 'quantity must be a positive integer');
  }
}

function validatePatch(body) {
  // Patch may include any subset of these. opened/opened_at are managed
  // exclusively via PATCH /:id/open — not editable here.
  const allowed = ['name', 'category', 'quantity', 'location', 'expiry_date', 'status'];
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) {
      throw httpError(400, 'invalid_field', `field '${key}' is not patchable here`);
    }
  }
  if (body.location !== undefined && !VALID_LOCATIONS.includes(body.location)) {
    throw httpError(400, 'invalid_location', `location must be one of: ${VALID_LOCATIONS.join(', ')}`);
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    throw httpError(400, 'invalid_status', `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (body.expiry_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.expiry_date)) {
    throw httpError(400, 'invalid_expiry_date', 'expiry_date must be YYYY-MM-DD');
  }
  if (body.quantity !== undefined && (!Number.isInteger(body.quantity) || body.quantity < 1)) {
    throw httpError(400, 'invalid_quantity', 'quantity must be a positive integer');
  }
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    throw httpError(400, 'invalid_name', 'name must be a non-empty string');
  }
}

// ───────────────────────────────────────────────────────────
// CRUD
// ───────────────────────────────────────────────────────────

/**
 * GET /api/items — filterable.
 * Filters: status (default 'active'), location, opened.
 * Pass status='all' to skip the status filter.
 */
export async function listItems(user, filters = {}) {
  // Conditions reference the items alias 'i.' (defined in ITEM_SELECT).
  const conditions = ['i.user_id = $1'];
  const params = [user.id];

  if (filters.status === undefined) {
    conditions.push(`i.status = 'active'`);
  } else if (filters.status !== 'all') {
    if (!VALID_STATUSES.includes(filters.status)) {
      throw httpError(400, 'invalid_status', `status must be one of: ${VALID_STATUSES.join(', ')} or 'all'`);
    }
    params.push(filters.status);
    conditions.push(`i.status = $${params.length}`);
  }
  if (filters.location !== undefined) {
    if (!VALID_LOCATIONS.includes(filters.location)) {
      throw httpError(400, 'invalid_location', `location must be one of: ${VALID_LOCATIONS.join(', ')}`);
    }
    params.push(filters.location);
    conditions.push(`i.location = $${params.length}`);
  }
  if (filters.opened !== undefined) {
    params.push(filters.opened);
    conditions.push(`i.opened = $${params.length}`);
  }

  const sql = `
    ${ITEM_SELECT}
    WHERE ${conditions.join(' AND ')}
    ORDER BY i.expiry_date ASC, i.name ASC
  `;
  const r = await query(sql, params);
  return r.rows.map(row => enrich(row, user));
}

export async function getItem(user, id) {
  return getItemOrThrow(user, id);
}

/**
 * PATCH /api/items/:id/mark-fine
 * Stamps user_marked_fine_at = NOW(). Lets the engine show "monitor"
 * for past-expiry items the user has eyeballed and decided are OK,
 * for a 24-hour grace window (Step 5 edge case).
 */
export async function markStillFine(user, id) {
  const r = await query(`
    UPDATE items SET user_marked_fine_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `, [id, user.id]);
  if (!r.rows.length) throw httpError(404, 'not_found', 'item not found');
  return getItemOrThrow(user, id);
}

export async function createItem(user, body) {
  validateForCreate(body);

  const opened = body.opened === true;
  const openedAt = opened ? new Date() : null;

  const r = await query(`
    INSERT INTO items
      (user_id, name, barcode, category, quantity, location, opened, opened_at, expiry_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `, [
    user.id,
    body.name.trim(),
    body.barcode || null,
    body.category || null,
    body.quantity || 1,
    body.location || 'fridge',
    opened,
    openedAt,
    body.expiry_date,
  ]);

  return getItemOrThrow(user, r.rows[0].id);
}

export async function updateItem(user, id, body) {
  validatePatch(body);

  const fields = Object.keys(body);
  if (fields.length === 0) {
    return getItemOrThrow(user, id);
  }

  const sets = fields.map((f, i) => `${f} = $${i + 1}`);
  const params = fields.map(f => body[f]);
  params.push(id, user.id);

  const r = await query(`
    UPDATE items SET ${sets.join(', ')}
    WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2}
    RETURNING id
  `, params);
  if (!r.rows.length) throw httpError(404, 'not_found', 'item not found');
  return getItemOrThrow(user, id);
}

export async function deleteItem(user, id) {
  const r = await query(
    'DELETE FROM items WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, user.id]
  );
  if (!r.rows.length) throw httpError(404, 'not_found', 'item not found');
}

/**
 * PATCH /api/items/:id/open
 * Sets opened=true, opened_at=NOW(), and recomputes expiry as
 *   LEAST(current_expiry, today + opened_days_typical)
 * using shelf_life_reference for (category, current_location, opened=true).
 *
 * Why LEAST: the user's existing expiry might already be tighter than the
 * opened-shelf-life would predict (e.g. they tracked a yogurt with 2 days
 * left). Don't push it later. But shrink it if the unopened-default was
 * generous.
 *
 * If we have no shelf-life data for this category+location, leave expiry
 * untouched.
 */
export async function markOpened(user, id) {
  const item = await getItemOrThrow(user, id);
  if (item.opened) return item; // idempotent

  let openedDays = null;
  if (item.category) {
    const slr = await query(`
      SELECT days_typical FROM shelf_life_reference
      WHERE category = $1 AND location = $2 AND opened = TRUE
      LIMIT 1
    `, [item.category, item.location]);
    if (slr.rows.length) openedDays = slr.rows[0].days_typical;
  }

  const sql = openedDays === null
    ? `UPDATE items SET opened = TRUE, opened_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING id`
    : `UPDATE items
       SET opened = TRUE, opened_at = NOW(),
           expiry_date = LEAST(expiry_date, CURRENT_DATE + $1::int)
       WHERE id = $2 AND user_id = $3 RETURNING id`;
  const params = openedDays === null ? [id, user.id] : [openedDays, id, user.id];

  await query(sql, params);
  return getItemOrThrow(user, id);
}

// ───────────────────────────────────────────────────────────
// Internal
// ───────────────────────────────────────────────────────────

async function getItemOrThrow(user, id) {
  const r = await query(
    `${ITEM_SELECT} WHERE i.id = $1 AND i.user_id = $2`,
    [id, user.id]
  );
  if (!r.rows.length) throw httpError(404, 'not_found', 'item not found');
  return enrich(r.rows[0], user);
}
