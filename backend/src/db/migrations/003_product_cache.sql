-- Cache for barcode → product lookups via Open Food Facts (OFF).
-- Cached forever for now — barcode→product info is stable. We can
-- add a TTL (cached_at < NOW() - 30 days, refresh) later if needed.

CREATE TABLE product_cache (
  barcode    TEXT PRIMARY KEY,
  name       TEXT,
  brand      TEXT,
  -- our internal category (e.g. 'dairy_milk'); NULL if no rule matched
  category   TEXT,
  -- raw OFF product object so we can re-derive category if the mapping rules change
  off_raw    JSONB,
  cached_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX product_cache_category_idx ON product_cache(category);
