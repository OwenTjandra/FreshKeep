# FreshKeep backend

Express + Postgres API.

## Quick start

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL and ANTHROPIC_API_KEY
npm install
npm run dev
```

The server listens on `$PORT` (default 3000). Health check: `GET /health`.

## Structure

```
src/
  server.js          # entry point
  routes/            # Express routers (added in Steps 3+)
  services/          # business logic
    expirationIntelligence.js   # rule engine (Step 5)
  db/
    migrations/      # SQL migrations (Step 1)
    seeds/           # seed data including USDA shelf-life reference (Step 2)
```

## Conventions

- ESM only (`"type": "module"` in package.json). Use `import x from './foo.js'` with explicit `.js`.
- Routes call services. Services own DB access and business logic. Keep route handlers thin.
- Errors: throw from services, catch in an Express error middleware (added with the first real route in Step 3).
