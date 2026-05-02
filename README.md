# FreshKeep

Track food expiry, get smart recommendations on what to eat, freeze, cook, or compost — and see it all on an Android home-screen widget.

## Stack

- **Frontend:** React Native + Expo (development build — *not* Expo Go, since we need native widget code)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **AI:** Anthropic API (Claude Sonnet 4.5) for recipe generation
- **Push:** Firebase Cloud Messaging
- **Widget:** Android home-screen widget for Samsung One UI (S25+ target device)

## Repo structure

```
FreshKeep/
├── frontend/          # Expo app
├── backend/           # Express API + Postgres
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   ├── services/  # Expiration intelligence engine lives here
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   ├── .env.example
│   └── package.json
├── CLAUDE.md          # Conventions for AI-assisted development
└── README.md
```

## Roadmap

### Phase 1 — Core app (Steps 0–20)
Scaffold → schema → barcode scan → items CRUD → **expiration intelligence engine** → onboarding → Expo screens → home dashboard grouped by recommended action → AI recipes → push notifications → Android widget.

### Phase 2 — Store integrations (Steps 21–25)
Store-connection schema → Costco mock connector → dual-date picker → pending imports flow → receipt-photo OCR via Claude vision.

The full 25-step plan lives in [CLAUDE.md](./CLAUDE.md).

## Setup

Backend and frontend each have their own `package.json`. Detailed setup instructions arrive with Step 1 (database migrations) and Step 7 (Expo dev client build).

```bash
# Backend (after Step 1)
cd backend
cp .env.example .env   # fill in DATABASE_URL, ANTHROPIC_API_KEY
npm install
npm run dev

# Frontend (after Step 7)
cd frontend
npm install
npx expo prebuild      # generates android/ ios/ for dev build
npx expo run:android
```

## License

Private project — not yet licensed for public use.
