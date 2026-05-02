import { query } from '../db/index.js';
import { fetchProduct, mapCategory } from './foodFacts.js';

/**
 * Look up a barcode: cache → Open Food Facts → return shape consumed by /api/scan.
 *
 * If OFF doesn't know the barcode, returns { found: false, manual_entry_required: true }.
 * Cache is forever (no TTL) since barcode → product info is stable.
 */
export async function scanBarcode(barcode) {
  const cached = await readCache(barcode);
  let product = cached;
  let cacheHit = !!cached;

  if (!cached) {
    const off = await fetchProduct(barcode);
    if (!off) {
      return { found: false, barcode, manual_entry_required: true };
    }
    const category = mapCategory(off.categoriesTags);
    product = {
      barcode,
      name: off.name,
      brand: off.brand,
      category,
    };
    await writeCache({ ...product, off_raw: off.raw });
  }

  const shelfLife = product.category ? await defaultShelfLife(product.category) : null;

  return {
    found: true,
    cached: cacheHit,
    barcode: product.barcode || barcode,
    name: product.name,
    brand: product.brand,
    category: product.category,
    shelf_life: shelfLife,
    manual_entry_required: !product.category, // OFF found it but we couldn't categorize it
  };
}

async function readCache(barcode) {
  const r = await query(
    'SELECT barcode, name, brand, category FROM product_cache WHERE barcode = $1',
    [barcode]
  );
  return r.rows[0] || null;
}

async function writeCache({ barcode, name, brand, category, off_raw }) {
  await query(`
    INSERT INTO product_cache (barcode, name, brand, category, off_raw)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (barcode) DO UPDATE
      SET name      = EXCLUDED.name,
          brand     = EXCLUDED.brand,
          category  = EXCLUDED.category,
          off_raw   = EXCLUDED.off_raw,
          cached_at = NOW()
  `, [barcode, name, brand, category, off_raw]);
}

async function defaultShelfLife(category) {
  // Default lookup assumes fridge + unopened. The Set Details screen (Step 8)
  // lets the user pick a different location, at which point the engine
  // re-resolves against the right (location, opened) row.
  const r = await query(`
    SELECT days_min, days_typical, days_max, freezable, source
    FROM shelf_life_reference
    WHERE category = $1 AND location = 'fridge' AND opened = FALSE
    LIMIT 1
  `, [category]);
  if (!r.rows.length) return null;
  return {
    ...r.rows[0],
    based_on: { location: 'fridge', opened: false },
  };
}
