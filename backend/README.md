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

- `GET  /health`     — service liveness
- `POST /api/scan`   — barcode lookup (Step 3). Body: `{ "barcode": "0000000000000" }`. Returns `{ found, name, brand, category, shelf_life: { days_min, days_typical, days_max, freezable, source, based_on } }` or `{ found: false, manual_entry_required: true }`. Cached in `product_cache`.

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
  routes/
    scan.js                               # POST /api/scan (Step 3)
  services/
    foodFacts.js                          # OFF client + category mapping (Step 3)
    scan.js                               # cache → OFF → shelf-life enrich (Step 3)
```

## Schema overview (Step 1)

- **users** — `email`, `fridge_temp_setting` (°F, default 37), timestamps. The temp setting feeds the engine's multiplier table in Step 6.
- **items** — `name`, `barcode`, `category`, `quantity`, `location` (fridge/freezer/counter/pantry), `opened` + `opened_at`, `expiry_date`, `status` (active/used/tossed/pending), `recommended_action` (cached engine output), `user_marked_fine_at` (24-hour grace timestamp for the "looks fine" override), timestamps. Includes a check constraint that `opened_at` is non-null iff `opened = true`.
- **stores** — Phase 2 placeholder. Just the table; populated when integrations land.
- **shelf_life_reference** — `(category, location, opened)` is unique. Stores `days_min`/`days_typical`/`days_max`, `freezable`, `source`. Populated by migration 002 from USDA FSIS FoodKeeper. Categories used: `dairy_milk`, `dairy_yogurt`, `dairy_cheese_hard`, `dairy_cheese_soft`, `dairy_butter`, `meat_chicken`, `meat_beef`, `meat_beef_ground`, `meat_pork`, `meat_fish`, `produce_leafy`, `produce_hard_veg`, `produce_soft_fruit`, `produce_hard_fruit`, `produce_berries`, `eggs`, `bread`, `deli`, `pantry_dry_goods`, `pantry_canned`.

Migrations are tracked in `schema_migrations` (filename + applied_at). Each migration runs in a transaction; failure rolls back.

## Conventions

- ESM only (`"type": "module"` in package.json). Use `import x from './foo.js'` with explicit `.js`.
- Routes call services. Services own DB access and business logic. Keep route handlers thin.
- Errors: throw from services, catch in an Express error middleware (added with the first real route in Step 3).
- Migrations are forward-only. To roll back during development, drop and re-create the database.
