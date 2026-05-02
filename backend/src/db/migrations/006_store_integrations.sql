-- Step 21/22: store integrations.
-- See docs/store-integrations.md for the architecture rationale.

CREATE TABLE store_connections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id             UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  external_account_id  TEXT,
  -- Encrypted-at-rest later when a real OAuth integration lands. Mocks use NULL.
  auth_tokens          JSONB,
  last_synced_at       TIMESTAMPTZ,
  status               TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'disconnected')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, store_id)
);

CREATE INDEX store_connections_user_idx ON store_connections(user_id);

CREATE TABLE store_imports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_connection_id   UUID NOT NULL REFERENCES store_connections(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  barcode               TEXT,
  category              TEXT,
  quantity              INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  -- Multiple candidate expiry dates. Stores like Costco for eggs frequently
  -- give two: the printed sell-by, and a use-by/best-by. The user picks one
  -- via the dual-date picker (Step 23).
  expiry_date_options   DATE[] NOT NULL,
  default_expiry_date   DATE NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'confirmed', 'rejected')),
  raw                   JSONB,
  created_item_id       UUID REFERENCES items(id) ON DELETE SET NULL,
  imported_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ
);

CREATE INDEX store_imports_user_status_idx ON store_imports(user_id, status);

-- Seed the Costco store row so mock-connect can find it.
INSERT INTO stores (name, slug, integration_type)
VALUES ('Costco', 'costco', 'mock')
ON CONFLICT (slug) DO NOTHING;
