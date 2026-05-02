# FreshKeep frontend

Expo (React Native) app — **development build, not Expo Go**, because the Android home-screen widget (Steps 16–19) needs native code that Expo Go can't run.

## Stack

- Expo SDK 54
- expo-router 6 (file-based routing under `app/`)
- React Native 0.81 / React 19

## Routes

```
app/
├── _layout.tsx              # root stack — wraps everything
├── onboarding.tsx           # one-time fridge-temp setup (Step 6 wiring later)
├── (tabs)/                  # bottom tab navigator
│   ├── _layout.tsx
│   ├── index.tsx            # Home (Step 9 will rebuild as action-grouped dashboard)
│   ├── scanner.tsx          # Scanner (Step 8 adds expo-barcode-scanner)
│   └── profile.tsx          # Profile
├── item/[id].tsx            # Item detail (push from Home)
└── recipe/[id].tsx          # AI recipe view (push from Item detail)
```

Step 7 set up the **routing only** — every screen is placeholder text. Feature code arrives in later steps.

## First-time setup (development build)

```bash
# Install JS deps
npm install

# Generate native projects (creates android/ and ios/)
npx expo prebuild

# Build & install on a connected Android device or emulator
npx expo run:android

# Once installed, future iterations:
npm start
# Then press 'a' to launch on Android, or scan the QR code with the dev client app
```

If `npm install` warns about peer-dep / Expo-SDK version mismatches, run `npx expo install --check` to auto-pin compatible versions.

## App identifiers

- iOS bundle: `com.owentjandra.freshkeep`
- Android package: `com.owentjandra.freshkeep`
- Deep-link scheme: `freshkeep://` (used in Step 17 for widget tap → item detail)

## Why not Expo Go?

The widget plus any custom Kotlin we add (Step 17) requires a development build. The `--dev-client` start command is wired into `npm start`.
