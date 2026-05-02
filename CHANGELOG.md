# Changelog

All notable changes to FreshKeep. Format roughly follows [Keep a Changelog](https://keepachangelog.com/). Each entry is a single roadmap step from `CLAUDE.md`; the SHA links to the commit on GitHub.

---

## [Phase 1 — 0.1.0] — 2026-05-02

Phase 1 ships the core app, the widget, and the backend deploy configs. **Step 20 (per-user Bayesian shelf-life adjuster) is intentionally deferred** until there's real usage data to learn from.

### Backend

| # | Title | SHA |
|---|---|---|
| 0 | Project scaffolding — frontend/backend split, README, CLAUDE.md | [`34cc75f → b118337`](https://github.com/OwenTjandra/FreshKeep/commit/34cc75f) |
| 1 | Postgres schema + migration runner + 10-item dev seed (users, stores, items, shelf_life_reference + 3 enums + updated_at trigger) | [`998f7ae`](https://github.com/OwenTjandra/FreshKeep/commit/998f7ae) |
| 2 | shelf_life_reference seeded with ~77 rows from USDA FSIS FoodKeeper covering dairy, meat, produce, eggs, bread, deli, pantry — `(category, location, opened)` unique | [`06f9b45`](https://github.com/OwenTjandra/FreshKeep/commit/06f9b45) |
| 3 | `POST /api/scan` — Open Food Facts client + ~20 ordered keyword rules mapping OFF categories → our taxonomy. Cached in `product_cache` (JSONB raw) | [`63d745e`](https://github.com/OwenTjandra/FreshKeep/commit/63d745e) |
| 4 | Items CRUD + `PATCH /:id/open` recompute (`LEAST(current, today + opened_days_typical)`) + dev-user middleware shim | [`f771852`](https://github.com/OwenTjandra/FreshKeep/commit/f771852) |
| 5 | **Expiration intelligence engine** + 16 unit tests via `node --test`. Pure synchronous decision tree (10 branches). Cookable list + freezable heuristic | [`fe48b02`](https://github.com/OwenTjandra/FreshKeep/commit/fe48b02) |
| 6 | Fridge-temp multiplier (≤35°F → 1.15x ... ≥41°F → 0.7x). Applied inside engine for `location='fridge'` AND `days >= 0` only. `users.onboarded_at` + `GET/PATCH /api/users/me` | [`b118337`](https://github.com/OwenTjandra/FreshKeep/commit/b118337) |
| 10 | `GET /api/items/:id`, `PATCH /:id/mark-fine` (24-hour grace stamp), `freezable` JOIN exposed on every item | [`4d58918`](https://github.com/OwenTjandra/FreshKeep/commit/4d58918) |
| 12 | `POST /api/recipes/suggest` — Anthropic SDK + Claude Sonnet 4.5. `tool_use` forces structured JSON. System prompt cached. Non-cookable items return `{type:'reminder'}` without an API call | [`bd6a317`](https://github.com/OwenTjandra/FreshKeep/commit/bd6a317) |
| 14 | Push notifications (Firebase optional). Contextual templating ("you haven't opened that yogurt yet — have it for breakfast?"). Scheduler ticks every 5 min, sends in 8–10am local window, max one push/day. `firebase-admin` is `optionalDependencies`; missing creds = logged stub | [`4be3437`](https://github.com/OwenTjandra/FreshKeep/commit/4be3437) |
| 15 | Deploy configs: Dockerfile, render.yaml blueprint, railway.toml. Migrations run on container start | [`8630dae`](https://github.com/OwenTjandra/FreshKeep/commit/8630dae) |

### Frontend (Expo + React Native)

| # | Title | SHA |
|---|---|---|
| 7 | Expo Router scaffold — root stack, `(tabs)` group (Home/Scan/Profile), Onboarding, `item/[id]`, `recipe/[id]`, `scan/details`. Configured for **development build, not Expo Go** | [`63698a5`](https://github.com/OwenTjandra/FreshKeep/commit/63698a5) |
| 8 | Scanner via `expo-camera` (`expo-barcode-scanner` is deprecated). Camera permission gate, single-shot scan with refocus reset. Set Details form with date/location/opened pickers | [`dec06e1`](https://github.com/OwenTjandra/FreshKeep/commit/dec06e1) |
| 9 | Home dashboard — 3 stat cards (Urgent / This week / Fresh) + 6 sections grouped by `recommended_action` in spec order. Inline "Mark frozen" + "Recipe" buttons. Pull-to-refresh + reload-on-focus | [`434da74`](https://github.com/OwenTjandra/FreshKeep/commit/434da74) |
| 10 | Item Detail — engine reason card + conditional buttons (Mark opened / Mark frozen / Still looks fine / Mark used / Toss it / Delete) | [`4d58918`](https://github.com/OwenTjandra/FreshKeep/commit/4d58918) |
| 11 | `lib/widgetCache.ts` — writes top-5 sorted by priority to `documentDirectory/widget-cache.json`. Schema v1 + emoji-per-category map | [`90dc24c`](https://github.com/OwenTjandra/FreshKeep/commit/90dc24c) |
| 13 | Recipe screen — accent-color highlight on `expiring: true` ingredients, "Cooked it" → mark used, "Get another recipe" re-calls the endpoint, reminder-card variant for non-cookable items | [`78e270a`](https://github.com/OwenTjandra/FreshKeep/commit/78e270a) |
| 14 | `lib/notifications.ts` — `expo-notifications` permission flow + Android channel + token registration on app launch | [`4be3437`](https://github.com/OwenTjandra/FreshKeep/commit/4be3437) |

### Android home-screen widget

| # | Title | SHA |
|---|---|---|
| 16 | Decision doc — picked **Jetpack Glance + Expo config plugin** over `react-native-android-widget`. One UI's process killing makes the JS-bridge approach lose to a pure-native widget | [`957ee57`](https://github.com/OwenTjandra/FreshKeep/commit/957ee57) |
| 17 | Three Glance widgets: Small (2x2 count), Medium (4x2 top-3 with action pills), Large (4x4 top-5 + reason callout). Reads `<Context.filesDir>/widget-cache.json`. Deep-links via `freshkeep://item/<id>`. Action color coding (red/amber/blue/green) | [`c71d025`](https://github.com/OwenTjandra/FreshKeep/commit/c71d025) |
| 18 | Refresh logic: 30-min built-in (`updatePeriodMillis`), daily 6am via `AlarmManager.setInexactRepeating`, BootReceiver to re-arm after restart, stale check (>24h) | [`63d472e`](https://github.com/OwenTjandra/FreshKeep/commit/63d472e) |
| 19 | S25+ test plan — adding all three sizes, dark mode, cold-start, restart, Samsung One UI battery optimization (Sleeping apps / Deep sleeping apps lists), deep-link verification, end-to-end smoke test | [`6c556fb`](https://github.com/OwenTjandra/FreshKeep/commit/6c556fb) |

### Known gaps (Phase 1)

- **Immediate widget refresh on JSON write** ([Step 18](https://github.com/OwenTjandra/FreshKeep/commit/63d472e)). The 30-min ceiling catches everything in practice; opening the app forces a refresh as a workaround. A clean fix needs a small Expo native module that broadcasts `ACTION_APPWIDGET_UPDATE` after `writeWidgetCache`.
- **Dark-mode widget colors** are bright-on-dark ([Step 19](docs/widget-test-plan-s25.md#b-dark-mode)). Cosmetic; fix uses Glance's `GlanceTheme`/`MaterialTheme.colorScheme.background`.
- **Frontend not yet exercised on real hardware.** All TS/JS code is committed but `npm install` + `npx expo prebuild --clean` + `npx expo run:android` haven't been run yet. First build may surface fixable Glance + plugin edge cases (hence Step 17's "first build may need small fixups" note).
- **Push notifications need Firebase project setup** to actually fire. The full system is wired; without `FIREBASE_SERVICE_ACCOUNT_PATH` it logs intended sends instead. Setup is documented in `backend/README.md`.

### Deferred

- **Step 20 — per-user Bayesian shelf-life adjuster.** Per the user's own caveat in `CLAUDE.md`: *"Don't let 'we should add ML' delay shipping. Skip until the rule engine is in production with real users."* Will be picked up after launch when there's spoilage data to learn from.

---

## [Unreleased — Phase 2 not started]

Steps 21–25: store integrations (`store_connections`, `store_imports`, Costco mock connector, dual-date picker, pending-imports flow, receipt OCR via Claude vision). Architecture-only docs first, code after.
