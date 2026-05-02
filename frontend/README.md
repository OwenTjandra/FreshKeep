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

## Getting an APK

Two paths. **EAS Build is the easy one** — no Android Studio install needed.

### Option A — EAS Build (cloud, ~20 min, no local Android tooling required)

```bash
cd "/Users/owentjandra/Documents/FreshKeep/frontend"
npm install
npx expo install --check        # pin SDK-compatible versions

# One-time
npm install -g eas-cli          # or use npx
npx eas-cli login               # creates a free Expo account if you don't have one
npx eas-cli build:configure     # uses eas.json already in this repo

# Build the preview APK
npx eas-cli build --platform android --profile preview
# Wait ~15-20 min. EAS prints a URL when done — download the APK from there
# and sideload it to your S25+ (transfer via USB, email, or scan the QR code
# from the build page on the phone).
```

The `preview` profile in `eas.json` produces an installable APK (not an AAB) so you can sideload directly. Use the `development` profile if you want a dev-client build that hot-reloads from `npm start`.

### Option B — Local build (need Android Studio + JDK + SDK first)

```bash
npm install
npx expo prebuild               # generates android/ ios/
npx expo run:android            # builds + installs on a connected device or emulator
```

This requires:
- Android Studio (~5 GB download)
- JDK 17 (Android Studio installs this)
- An emulator or a USB-connected device with Developer mode + USB debugging on

Use Option A if you don't already have Android Studio set up.

If `npm install` warns about peer-dep / Expo-SDK version mismatches, run `npx expo install --check` to auto-pin compatible versions.

## App identifiers

- iOS bundle: `com.owentjandra.freshkeep`
- Android package: `com.owentjandra.freshkeep`
- Deep-link scheme: `freshkeep://` (used in Step 17 for widget tap → item detail)

## Why not Expo Go?

The widget plus any custom Kotlin we add (Step 17) requires a development build. The `--dev-client` start command is wired into `npm start`.

## Android home-screen widget (Step 17)

The widget is built natively (Jetpack Glance + Kotlin) and installed by an Expo config plugin so it survives `expo prebuild`.

```
plugins/
  withFreshKeepWidget.js      # the config plugin — runs at prebuild time
widget-android-src/
  java/com/owentjandra/freshkeep/widget/
    WidgetCache.kt            # reads <Context.filesDir>/widget-cache.json
    WidgetTheme.kt            # action→color mapping, deep-link intents
    SmallWidget.kt            # 2x2 — count of eat_now + eat_soon
    MediumWidget.kt           # 4x2 — top 3 items
    LargeWidget.kt            # 4x4 — top 5 + reason callout
  res/xml/                    # appwidget-provider XMLs (one per size)
  res/values/                 # widget descriptions
```

When you run `npx expo prebuild --clean`, the plugin:
1. Copies the Kotlin sources into `android/app/src/main/java/.../widget/`
2. Copies the XML resources into `android/app/src/main/res/`
3. Adds three `<receiver>` entries to `AndroidManifest.xml`
4. Adds `androidx.glance:glance-appwidget` to `app/build.gradle`

Then `npx expo run:android` builds and installs. Long-press your home screen → Widgets → FreshKeep → drag any size onto the screen.

Tap behavior: any item row deep-links via `freshkeep://item/<id>`.

If the widget shows "tap to refresh", the JSON cache is older than 24h. Open the app to refresh (Step 18 will add automatic refresh paths).
