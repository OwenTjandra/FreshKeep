-- FreshKeep initial schema
-- Tables: users, stores, items, shelf_life_reference

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────────────────────────────────────────────────────────
-- ENUMs
-- ───────────────────────────────────────────────────────────

CREATE TYPE item_location AS ENUM ('fridge', 'freezer', 'counter', 'pantry');

CREATE TYPE item_status AS ENUM ('active', 'used', 'tossed', 'pending');

CREATE TYPE recommended_action AS ENUM (
  'eat_now',
  'eat_soon',
  'freeze_now',
  'use_in_recipe',
  'compost',
  'monitor',
  'safe'
);

-- ───────────────────────────────────────────────────────────
-- users
-- ───────────────────────────────────────────────────────────

CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT UNIQUE,
  -- Fridge temperature in degrees Fahrenheit. Default 37°F per Step 6.
  -- The expiration intelligence engine multiplies shelf-life days based on this:
  --   ≤35°F → 1.15x   36-38°F → 1.0x   39-40°F → 0.85x   ≥41°F → 0.7x
  fridge_temp_setting INTEGER NOT NULL DEFAULT 37 CHECK (fridge_temp_setting BETWEEN 32 AND 50),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────
-- stores  (Phase 2)
-- Created here so foreign keys from store_connections / store_imports
-- (added in Phase 2) land cleanly without a follow-up migration.
-- ───────────────────────────────────────────────────────────

CREATE TABLE stores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('mock', 'oauth_api', 'receipt_ocr')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────
-- items
-- ───────────────────────────────────────────────────────────

CREATE TABLE items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  barcode              TEXT,
  -- Loose category key joined informally to shelf_life_reference.category.
  -- Not a foreign key because user-entered items may use categories we
  -- haven't seeded reference data for yet — that's fine, the engine
  -- falls back to the user-provided expiry_date.
  category             TEXT,
  quantity             INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  location             item_location NOT NULL DEFAULT 'fridge',
  opened               BOOLEAN NOT NULL DEFAULT FALSE,
  opened_at            TIMESTAMPTZ,
  expiry_date          DATE NOT NULL,
  status               item_status NOT NULL DEFAULT 'active',
  -- Cached output of the rule engine. NULL until first computation.
  recommended_action   recommended_action,
  -- Set when a user reports a past-expiry item still looks/smells fine.
  -- The engine keeps it in 'monitor' for 24 hours from this timestamp,
  -- then forces 'compost' (Step 5 edge case).
  user_marked_fine_at  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT items_opened_at_iff_opened
    CHECK ((opened = TRUE AND opened_at IS NOT NULL)
        OR (opened = FALSE AND opened_at IS NULL))
);

CREATE INDEX items_user_status_idx ON items(user_id, status);
CREATE INDEX items_expiry_date_idx ON items(expiry_date);
CREATE INDEX items_barcode_idx     ON items(barcode) WHERE barcode IS NOT NULL;

-- ───────────────────────────────────────────────────────────
-- shelf_life_reference  (populated in Step 2 from USDA FoodKeeper)
-- One row per (category, location, opened) combination.
-- ───────────────────────────────────────────────────────────

CREATE TABLE shelf_life_reference (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      TEXT NOT NULL,
  location      item_location NOT NULL,
  opened        BOOLEAN NOT NULL DEFAULT FALSE,
  days_min      INTEGER NOT NULL CHECK (days_min     >= 0),
  days_typical  INTEGER NOT NULL CHECK (days_typical >= days_min),
  days_max      INTEGER NOT NULL CHECK (days_max     >= days_typical),
  freezable     BOOLEAN NOT NULL DEFAULT FALSE,
  source        TEXT NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (category, location, opened)
);

CREATE INDEX shelf_life_lookup_idx ON shelf_life_reference(category, location, opened);

-- ───────────────────────────────────────────────────────────
-- updated_at trigger
-- ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER items_set_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
