# FreshKeep — AI-assisted development conventions

This file is for Claude Code (and any other AI assistant) working in this repo.

## Project goal

FreshKeep is a food expiry tracker. The differentiator is the **expiration intelligence engine** — a rule engine that recommends actions (eat now, eat soon, freeze, use in recipe, compost, monitor, safe) based on item state, location, and shelf-life data, surfaced both in the app and on an Android home-screen widget.

## Stack

- Expo development build (not Expo Go — needs native widget code)
- Node.js + Express + Postgres backend
- Anthropic API (Claude Sonnet 4.5) for recipe generation
- Firebase FCM for push notifications
- Android home-screen widget for Samsung One UI (S25+ target)

## Phase 1 → Phase 2 roadmap

Phase 1 (Steps 0–20) builds the core app and widget. Phase 2 (21–25) adds store integrations (Costco mock connector, receipt OCR via Claude vision).

## Development conventions

- **One commit per numbered step.** Commit message format: `Step N: <short title>`.
- Each commit should leave the repo in a working state — tests passing, server starts.
- The backend is **ESM** (`"type": "module"` in package.json). Use `import` syntax with explicit `.js` extensions in relative imports.
- No mocking the database in integration tests — hit a real Postgres instance.
- Expiry-related dates are stored as `DATE` (not `TIMESTAMP`) unless time-of-day matters.

## Steps that need extra care

The user has flagged these as load-bearing — explain reasoning before writing code:

- **Step 5 — Expiration intelligence engine.** The most important step in the project. Cover all listed edge cases (opened items, frozen items, "looks fine" 24-hour grace period). Write unit tests for ≥8 scenarios.
- **Step 6 — Fridge temperature multipliers.** The multiplier table values are educated guesses; treat them as a starting point, not gospel. Document the table in code so they're easy to tune later.
- **Step 14 — Contextual notifications.** Don't just say "milk expires in 3 days." Use the engine's `recommended_action` + item state (opened/unopened, location, category) to write *contextual nudges* — e.g. *"You haven't opened that yogurt yet and it expires tomorrow — have it for breakfast!"* Time them for morning local time (target 8–10am window). **Never send between 11pm and 7am.** One push per day max, prioritizing the highest-priority item.
- **Step 20 — Bayesian shelf-life adjuster.** Genuinely optional. Don't let "we should add ML" delay shipping. Skip until the rule engine is in production with real users.

## Things to avoid

- Don't use Expo Go for testing — we need a development build for native widget code.
- Don't add backwards-compat shims; this is a fresh project, no users yet.
- Don't preemptively add the Bayesian adjuster (Step 20) before usage data exists.

## Repository structure

```
frontend/   # Expo dev build app
backend/    # Express + Postgres
  src/
    routes/      # Express route handlers
    services/    # Business logic — expirationIntelligence.js lives here
    db/
      migrations/
      seeds/
```
