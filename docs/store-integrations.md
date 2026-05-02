# Store integrations — architecture (Step 21)

> Phase 2 goal: import groceries directly from a store the moment you buy them, so the user doesn't have to scan barcodes one at a time.

---

## Schema

Two new tables alongside the Phase 1 `stores` table.

### `store_connections`
A user's link to a store. One row per (user, store).

| column                 | type            | notes |
|------------------------|-----------------|-------|
| `id`                   | UUID PK         | gen_random_uuid() |
| `user_id`              | UUID FK users   | ON DELETE CASCADE |
| `store_id`             | UUID FK stores  | ON DELETE CASCADE |
| `external_account_id`  | TEXT            | membership #, OAuth subject, etc. NULL for mocks. |
| `auth_tokens`          | JSONB           | encrypted at rest for real OAuth. NULL for mocks. |
| `last_synced_at`       | TIMESTAMPTZ     | NULL until first sync |
| `status`               | TEXT            | `active` / `disconnected` (CHECK) |
| `created_at`           | TIMESTAMPTZ     | DEFAULT NOW() |
| **UNIQUE**             | (user_id, store_id) ||

### `store_imports`
A line item returned by a sync, before the user has confirmed it as a tracked item.

| column                  | type             | notes |
|-------------------------|------------------|-------|
| `id`                    | UUID PK          ||
| `user_id`               | UUID FK users    | denormalized — most queries scope by user |
| `store_connection_id`   | UUID FK store_connections | ON DELETE CASCADE |
| `name`                  | TEXT             | normalized product name |
| `barcode`               | TEXT             | nullable |
| `category`              | TEXT             | mapped to our taxonomy if possible |
| `quantity`              | INTEGER          | DEFAULT 1, > 0 |
| `expiry_date_options`   | DATE[]           | one or more candidate dates (eggs frequently have two) |
| `default_expiry_date`   | DATE             | the connector's best guess |
| `status`                | TEXT             | `pending` / `confirmed` / `rejected` (CHECK) |
| `raw`                   | JSONB            | the connector's untouched line — for debugging mismatches |
| `created_item_id`       | UUID FK items    | NULL until confirmed; ON DELETE SET NULL |
| `imported_at`           | TIMESTAMPTZ      | DEFAULT NOW() |
| `resolved_at`           | TIMESTAMPTZ      | NULL while pending |

Indexes: `(user_id, status)` for the pending-list query.

### What about Phase 1's `stores` table?

Already exists from migration 001. Currently empty. We seed it as part of Step 22 (one row for Costco).

---

## API

All routes under `/api/stores` and `/api/imports` are scoped to the authenticated user via the existing `devUser` middleware (replaced with real auth later).

| method | path                               | purpose |
|--------|------------------------------------|---------|
| `GET`  | `/api/stores`                      | list all stores the app supports + whether the user has a connection to each |
| `POST` | `/api/stores/connections`          | body: `{ store_slug, ... auth_data }`. For mocks: just creates the row. For real OAuth: starts the OAuth dance and returns a redirect URL. |
| `DELETE` | `/api/stores/connections/:id`    | mark `status='disconnected'` |
| `POST` | `/api/stores/connections/:id/sync` | invokes the right connector, creates `store_imports` rows |
| `GET`  | `/api/imports`                     | list user's pending imports (default `status=pending`, filterable) |
| `POST` | `/api/imports/:id/confirm`         | body: `{ expiry_date, location? }`. Creates a real `items` row, marks the import `status='confirmed'`, fills `created_item_id` |
| `POST` | `/api/imports/:id/reject`          | marks `status='rejected'` |

---

## Connector interface

Each store integration implements:

```js
// services/storeConnectors/<slug>.js
export const slug = 'costco';
export const name = 'Costco';
export const integrationType = 'mock' | 'oauth_api' | 'receipt_ocr';

// Verifies / creates the connection. Returns the auth_tokens to store
// (or null for mocks).
export async function connect(user, body) { ... }

// Pulls fresh purchases. Returns an array of normalized line items:
//   { name, barcode?, category?, quantity, expiry_date_options[], default_expiry_date, raw }
// The route handler writes these into store_imports.
export async function sync(connection) { ... }
```

The route layer is connector-agnostic — it picks the right connector module by `store.slug` and calls its functions.

---

## Why three connector types?

| `integrationType` | Examples | How it works |
|-----|-----|-----|
| `mock` | Costco (Step 22) | Returns hardcoded line items. Demo / test fixture. |
| `oauth_api` | (none in roadmap yet — placeholder for any retailer that exposes a customer purchases API in the future) | OAuth flow → store API → fetch recent orders → normalize. |
| `receipt_ocr` | Receipt scanner (Step 25) | User snaps a photo → Claude Sonnet 4.5 vision parses → normalize. Same downstream import flow as the others. |

The point of this taxonomy: **the user's confirm/reject flow is identical regardless of where the items came from.** Step 24 builds the pending-imports UI once and it serves all three.

---

## Why Costco is `mock` and not `oauth_api`

Costco does not expose a public purchases API for individual members. Options for the future:

1. **B2B partnership** — Costco could give us scoped read access to a member's purchase history. Requires actual business relationship.
2. **Receipt OCR (Step 25)** — already on the roadmap. The user snaps a Costco receipt; Claude parses the line items.
3. **Reverse-engineering the customer-facing site** — possible but fragile and Terms-of-Service-violating. Not pursuing.

Until (1) or (2) lands, the mock connector exists so we can build/test the **import pipeline** — the dual-date picker (Step 23), the pending-imports flow (Step 24), and the rule-engine handoff. The pipeline is what's valuable; the mock is the cheapest way to exercise it.

---

## Unresolved details (called out for later)

- **Encryption at rest for `auth_tokens`.** When a real OAuth integration lands, we should encrypt the JSONB before storing. Postgres `pgcrypto` is already enabled (Step 1).
- **Sync deduplication.** If the user syncs the same Costco trip twice, the connector should detect it and skip already-imported lines. For the mock we just dump 14 fresh rows every time — fine for testing.
- **Pending-import expiry.** A pending import sitting unresolved for ~7 days probably means the user forgot. Should we auto-archive? Probably yes, eventually — out of scope for Phase 2.
