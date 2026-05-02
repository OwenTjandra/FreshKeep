# FreshKeep backend

Express + Postgres API.

## Quick start

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL and ANTHROPIC_API_KEY

npm install

createdb freshkeep        # one-time, if your local Postgres doesn't have it yet
npm run migrate           # apply schema
npm run seed              # 1 demo user + 10 sample items

npm run dev               # starts the API with --watch
```

The server listens on `$PORT` (default 3000).

## Endpoints

- `GET  /health`                   — service liveness
- `POST /api/scan`                 — barcode lookup (Step 3). Body: `{ "barcode": "0000000000000" }`. Returns `{ found, name, brand, category, shelf_life: { days_min, days_typical, days_max, freezable, source, based_on } }` or `{ found: false, manual_entry_required: true }`. Cached in `product_cache`.
- `GET  /api/items`                — list items (Step 4). Filters: `status`, `location`, `opened`. Default: active items only. Each item returns `days_until_expiry` and `recommended_action` (engine output, currently `null` until Step 5).
- `POST /api/items`                — create. Required: `name`, `expiry_date` (YYYY-MM-DD). Optional: `barcode`, `category`, `quantity`, `location` (default `fridge`), `opened`. If `opened=true`, `opened_at` is set to now automatically.
- `PATCH /api/items/:id`           — update `name`, `category`, `quantity`, `location`, `expiry_date`, `status`. (Use `/open` to flip `opened`.)
- `PATCH /api/items/:id/open`      — mark opened: sets `opened=true`, `opened_at=NOW()`, and recomputes `expiry_date = LEAST(current, today + opened_days_typical)` from the shelf-life table.
- `DELETE /api/items/:id`          — hard delete. (To mark as eaten or thrown out, PATCH `status` to `used` / `tossed`.)

All `/api/items` routes are scoped to the seeded demo user via the dev middleware. Real auth is deferred.

## Structure

```
src/
  server.js          # entry point
  routes/            # Express routers (added in Steps 3+)
  services/          # business logic
    expirationIntelligence.js   # rule engine (Step 5)
  db/
    index.js                    # pg.Pool used by the app
    migrate.js                  # migration runner — `npm run migrate`
    migrations/
      001_initial.sql                     # users, stores, items, shelf_life_reference
      002_seed_shelf_life_reference.sql   # ~77 rows from USDA FSIS FoodKeeper (Step 2)
      003_product_cache.sql               # barcode → OFF lookup cache (Step 3)
    seeds/
      seed.js                             # 1 demo user + 10 sample items (Step 1)
  middleware/
    devUser.js                            # demo-user shim (Step 4) — replace with real auth later
  routes/
    scan.js                               # POST /api/scan (Step 3)
    items.js                              # /api/items CRUD + /:id/open (Step 4)
  services/
    foodFacts.js                          # OFF client + category mapping (Step 3)
    scan.js                               # cache → OFF → shelf-life enrich (Step 3)
    items.js                              # items CRUD + markOpened recompute (Step 4)
    expirationIntelligence.js             # rule engine (Step 5; currently a stub)
```

## Schema overview (Step 1)

- **users** — `email`, `fridge_temp_setting` (°F, default 37), timestamps. The temp setting feeds the engine's multiplier table in Step 6.
- **items** — `name`, `barcode`, `category`, `quantity`, `location` (fridge/freezer/counter/pantry), `opened` + `opened_at`, `expiry_date`, `status` (active/used/tossed/pending), `recommended_action` (cached engine output), `user_marked_fine_at` (24-hour grace timestamp for the "looks fine" override), timestamps. Includes a check constraint that `opened_at` is non-null iff `opened = true`.
- **stores** — Phase 2 placeholder. Just the table; populated when integrations land.
- **shelf_life_reference** — `(category, location, opened)` is unique. Stores `days_min`/`days_typical`/`days_max`, `freezable`, `source`. Populated by migration 002 from USDA FSIS FoodKeeper. Categories used: `dairy_milk`, `dairy_yogurt`, `dairy_cheese_hard`, `dairy_cheese_soft`, `dairy_butter`, `meat_chicken`, `meat_beef`, `meat_beef_ground`, `meat_pork`, `meat_fish`, `produce_leafy`, `produce_hard_veg`, `produce_soft_fruit`, `produce_hard_fruit`, `produce_berries`, `eggs`, `bread`, `deli`, `pantry_dry_goods`, `pantry_canned`.

Migrations are tracked in `schema_migrations` (filename + applied_at). Each migration runs in a transaction; failure rolls back.

## Expiration intelligence engine (Step 5)

`services/expirationIntelligence.js` — pure, synchronous, no I/O. Decides what we tell the user to do with each item.

```
input:  { location, category, days_until_expiry, freezable?, user_marked_fine_at? }
output: { action, priority (1-5), reason }  |  null
```

**Decision tree (top to bottom — first match wins):**

| # | Condition                                                | Action          | Priority |
|---|----------------------------------------------------------|-----------------|----------|
| 1 | `location = freezer`                                     | `safe`          | 5        |
| 2 | past expiry AND `user_marked_fine_at` < 24h ago          | `monitor`       | 3        |
| 3 | past expiry                                              | `compost`       | 1        |
| 4 | ≤1 day AND cookable                                      | `use_in_recipe` | 1        |
| 5 | ≤1 day                                                   | `eat_now`       | 1        |
| 6 | ≤3 days AND cookable                                     | `use_in_recipe` | 2        |
| 7 | ≤3 days                                                  | `eat_soon`      | 2        |
| 8 | 4–5 days AND freezable AND not in freezer                | `freeze_now`    | 2        |
| 9 | 4–7 days                                                 | `eat_soon`      | 2        |
| 10| >7 days                                                  | `safe`          | 5        |

**Cookable categories** (use in `use_in_recipe`):
`meat_chicken`, `meat_beef`, `meat_beef_ground`, `meat_pork`, `meat_fish`, `produce_leafy`, `produce_hard_veg`, `produce_soft_fruit`, `produce_berries`, `eggs`, `bread`, `pantry_dry_goods`. The rest get `eat_soon` and Step 12's recipe endpoint returns `{type: 'reminder'}` for them.

**Freezable** is taken from the `shelf_life_reference.freezable` column when the items service enriches the row via JOIN; otherwise the engine falls back to a small not-freezable-category heuristic (`dairy_cheese_soft`, `pantry_dry_goods`, `pantry_canned`).

**Tests:** 16 scenarios in `services/__tests__/expirationIntelligence.test.js` covering every branch + defensive null cases. Run with `npm test` (uses Node's built-in test runner — no Jest/Mocha needed).

The `_user` parameter is reserved for the Step 6 fridge-temperature multiplier — Step 6 will scale `days_until_expiry` *before* it reaches the engine, so this engine doesn't change.

## Conventions

- ESM only (`"type": "module"` in package.json). Use `import x from './foo.js'` with explicit `.js`.
- Routes call services. Services own DB access and business logic. Keep route handlers thin.
- Errors: throw from services, catch in an Express error middleware (added with the first real route in Step 3).
- Migrations are forward-only. To roll back during development, drop and re-create the database.
