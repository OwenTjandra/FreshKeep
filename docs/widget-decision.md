# Widget approach — decision doc (Step 16)

> **Question:** For the Samsung S25+ home-screen widget, do we use [`react-native-android-widget`](https://github.com/sAleksovski/react-native-android-widget) or a native Kotlin module with Jetpack Glance?
>
> **Recommendation:** Native Kotlin module using **Jetpack Glance** + an **Expo config plugin** to keep the native code version-controlled and re-applied on every `expo prebuild`.

---

## TL;DR

Pick **native Kotlin + Glance**. The widget data is already a JSON file on disk (Step 11), so we never need JS to render a tile. Going native sidesteps the React Native bridge entirely — which matters a lot on Samsung One UI, where aggressive background-process killing means the JS runtime usually isn't alive when the widget needs to update.

`react-native-android-widget` is convenient if you want to write widget UI in JSX, but it adds a single-maintainer dependency, ships a bridge layer that One UI fights, and forces every widget refresh path through JS.

The cost of going native is one config plugin and a few small Kotlin files. Long-term that's much cheaper to maintain.

---

## Option A — `react-native-android-widget`

**What it is:** An npm package that lets you write Android widget layouts in JSX/TSX. Under the hood it converts your component tree to Android `RemoteViews` and bridges back to JS to update widget content.

| Pros | Cons |
|------|------|
| Single language (TypeScript) for app + widget | Single maintainer, ~2k stars — bus-factor risk |
| JSX feels familiar | Layout vocabulary is a subset of `RemoteViews` (no full Compose) |
| One npm install + a config plugin | Every widget update has to wake the JS bridge |
| Hot reload during dev | Lags behind Expo SDK upgrades |
| | Samsung One UI battery optimization aggressively kills JS bridges, which can leave the widget on stale data |
| | Limited control over Glance-only features (theming, dynamic color, sizing modes) |

## Option B — Native Kotlin + Jetpack Glance

**What it is:** A Kotlin `GlanceAppWidget` (Compose-style declarative widgets) plus an `AppWidgetReceiver`, packaged as an [Expo config plugin](https://docs.expo.dev/config-plugins/introduction/) so the files are committed to the repo and re-applied on every `expo prebuild`.

| Pros | Cons |
|------|------|
| **No JS bridge in the widget hot path.** Widget reads `context.filesDir + '/widget-cache.json'` directly. | Two languages: TS for the app, Kotlin for the widget |
| Survives One UI's process killing — Glance widgets render from `Context`, no app process required | Requires Kotlin / Android Studio knowledge |
| Full Glance surface area: dynamic color, multiple sizes, click intents to deep-link, dark mode automatic | Initial setup is more involved (config plugin scaffolding) |
| WorkManager + AlarmManager for refresh — Android-standard, debuggable | |
| AndroidX is maintained by Google, not a single OSS contributor | |

## Decision drivers specific to this project

1. **The widget already has its data on disk.** Step 11 writes `widget-cache.json` to `context.filesDir`. Glance can read it with `File(context.filesDir, "widget-cache.json").readText()` — no IPC, no bridge. This is the architecture that makes native cheap.
2. **Samsung One UI is aggressive about killing background processes.** From One UI 4 onward, "deep sleeping" apps suspends the RN bridge. Anything that depends on JS to refresh a widget is fighting that. Glance widgets are unaffected.
3. **Expo dev build (not Expo Go).** This means we can add native code without losing dev-time iteration — the friction argument for `react-native-android-widget` is weaker than it would be in Expo Go.
4. **Long-term maintenance.** The user explicitly asked for "the one with less long-term maintenance pain." Glance is a Google-supported AndroidX library; `react-native-android-widget` is a single maintainer's project.

## What Step 17 will look like

- New folder `widget/` (config-plugin source) plus the actual Kotlin in `android/app/src/main/java/com/owentjandra/freshkeep/widget/`.
- An [Expo config plugin](https://docs.expo.dev/config-plugins/introduction/) wires the AndroidManifest + Gradle dependencies on every `expo prebuild`.
- Three Glance widgets (sizes 2x2, 4x2, 4x4) — see Step 17 spec.
- Click intents deep-link via `freshkeep://item/<id>` (the scheme we set in Step 7).
- Reads `widget-cache.json` from `context.filesDir`. Schema version (`WIDGET_CACHE_SCHEMA_VERSION = 1`) is checked; mismatch shows a "tap to refresh" state (see Step 18 stale-data handling).

## Summary trade-off

| | `react-native-android-widget` | **Native Kotlin + Glance** |
|---|---|---|
| Time to first working widget | hours | days |
| Risk on SDK upgrades | medium-high | low |
| One UI background-kill resilience | poor | excellent |
| Long-term maintenance | growing tech debt | stays current with Android |
| Code per widget size | similar | similar |

We're paying one extra day in Step 17 for years less pain.
