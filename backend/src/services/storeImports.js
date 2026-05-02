import { query } from '../db/index.js';
import { getConnector } from './storeConnectors/index.js';

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// ─── Stores + connections ──────────────────────────────────

export async function listStores(user) {
  const r = await query(`
    SELECT s.id, s.name, s.slug, s.integration_type,
           sc.id            AS connection_id,
           sc.last_synced_at,
           sc.status        AS connection_status
    FROM stores s
    LEFT JOIN store_connections sc
      ON sc.store_id = s.id AND sc.user_id = $1
    ORDER BY s.name
  `, [user.id]);
  return r.rows;
}

export async function connectStore(user, body) {
  const slug = body?.store_slug;
  if (typeof slug !== 'string' || !slug) {
    throw httpError(400, 'invalid_input', 'store_slug is required');
  }
  const storeRes = await query('SELECT id, slug FROM stores WHERE slug = $1', [slug]);
  if (!storeRes.rows.length) throw httpError(404, 'unknown_store', `no store with slug ${slug}`);
  const connector = getConnector(slug);
  if (!connector) throw httpError(500, 'no_connector', `no connector module for ${slug}`);

  const result = await connector.connect(user, body);
  const upserted = await query(`
    INSERT INTO store_connections (user_id, store_id, external_account_id, auth_tokens, status)
    VALUES ($1, $2, $3, $4, 'active')
    ON CONFLICT (user_id, store_id) DO UPDATE
      SET external_account_id = EXCLUDED.external_account_id,
          auth_tokens         = EXCLUDED.auth_tokens,
          status              = 'active'
    RETURNING *
  `, [user.id, storeRes.rows[0].id, result.external_account_id || null, result.auth_tokens || null]);
  return upserted.rows[0];
}

export async function disconnectStore(user, connectionId) {
  const r = await query(`
    UPDATE store_connections SET status = 'disconnected'
    WHERE id = $1 AND user_id = $2 RETURNING id
  `, [connectionId, user.id]);
  if (!r.rows.length) throw httpError(404, 'not_found', 'connection not found');
}

// ─── Sync ──────────────────────────────────────────────────

export async function syncConnection(user, connectionId) {
  const connRes = await query(`
    SELECT sc.*, s.slug
    FROM store_connections sc
    JOIN stores s ON s.id = sc.store_id
    WHERE sc.id = $1 AND sc.user_id = $2 AND sc.status = 'active'
  `, [connectionId, user.id]);
  if (!connRes.rows.length) throw httpError(404, 'not_found', 'active connection not found');
  const connection = connRes.rows[0];

  const connector = getConnector(connection.slug);
  if (!connector) throw httpError(500, 'no_connector', `no connector for ${connection.slug}`);

  const lines = await connector.sync(connection);

  const inserted = [];
  for (const line of lines) {
    const r = await query(`
      INSERT INTO store_imports
        (user_id, store_connection_id, name, barcode, category, quantity,
         expiry_date_options, default_expiry_date, raw)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      user.id,
      connection.id,
      line.name,
      line.barcode || null,
      line.category || null,
      line.quantity || 1,
      line.expiry_date_options,
      line.default_expiry_date,
      line.raw || null,
    ]);
    inserted.push(r.rows[0]);
  }

  await query(`UPDATE store_connections SET last_synced_at = NOW() WHERE id = $1`, [connection.id]);
  return { count: inserted.length, imports: inserted };
}

// ─── Pending imports / confirm / reject ────────────────────

export async function listImports(user, filters = {}) {
  const status = filters.status || 'pending';
  if (!['pending', 'confirmed', 'rejected', 'all'].includes(status)) {
    throw httpError(400, 'invalid_status', 'status must be one of: pending, confirmed, rejected, all');
  }
  const conditions = ['user_id = $1'];
  const params = [user.id];
  if (status !== 'all') {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  const r = await query(`
    SELECT * FROM store_imports
    WHERE ${conditions.join(' AND ')}
    ORDER BY imported_at DESC
  `, params);
  return r.rows;
}

export async function confirmImport(user, importId, body) {
  const expiryDate = body?.expiry_date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate || '')) {
    throw httpError(400, 'invalid_expiry_date', 'expiry_date (YYYY-MM-DD) is required');
  }
  const location = body?.location || 'fridge';
  if (!['fridge', 'freezer', 'counter', 'pantry'].includes(location)) {
    throw httpError(400, 'invalid_location', `invalid location: ${location}`);
  }

  // Lock the import row to avoid double-confirm under concurrent requests.
  const impRes = await query(
    'SELECT * FROM store_imports WHERE id = $1 AND user_id = $2 FOR UPDATE',
    [importId, user.id]
  );
  if (!impRes.rows.length) throw httpError(404, 'not_found', 'import not found');
  const imp = impRes.rows[0];
  if (imp.status !== 'pending') throw httpError(409, 'already_resolved', `import is ${imp.status}`);

  // Create the real item.
  const itemRes = await query(`
    INSERT INTO items (user_id, name, barcode, category, quantity, location, opened, opened_at, expiry_date)
    VALUES ($1, $2, $3, $4, $5, $6, FALSE, NULL, $7)
    RETURNING id
  `, [user.id, imp.name, imp.barcode, imp.category, imp.quantity, location, expiryDate]);
  const itemId = itemRes.rows[0].id;

  await query(`
    UPDATE store_imports
    SET status = 'confirmed', resolved_at = NOW(), created_item_id = $1
    WHERE id = $2
  `, [itemId, importId]);

  return { import_id: importId, created_item_id: itemId };
}

export async function rejectImport(user, importId) {
  const r = await query(`
    UPDATE store_imports
    SET status = 'rejected', resolved_at = NOW()
    WHERE id = $1 AND user_id = $2 AND status = 'pending'
    RETURNING id
  `, [importId, user.id]);
  if (!r.rows.length) throw httpError(404, 'not_found_or_resolved', 'import not found or already resolved');
}
