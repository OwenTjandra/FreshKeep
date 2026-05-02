# Widget test plan — Samsung S25+ on One UI 7

> Real-device testing for the FreshKeep widget. Run this checklist after `npx expo prebuild --clean && npx expo run:android` installs the dev build on your S25+.

---

## Pre-flight

1. **Backend running** — either local (`npm run dev` in `backend/`) reachable at your LAN IP, or deployed (Step 15). Set `EXPO_PUBLIC_API_URL` in `frontend/.env` to whatever URL works from the phone (NOT `localhost` — that's the phone's loopback).
2. **App installed and signed in** — open the app once, complete onboarding (so `users.fridge_temp_setting` and `onboarded_at` are set).
3. **Seed or scan a few items** — at minimum: one in `eat_now`, one in `freeze_now`, one in `safe`. The widget needs items in different action buckets to look meaningful.
4. **Confirm `widget-cache.json` exists** — back on your dev machine: `adb shell run-as com.owentjandra.freshkeep ls files/`. You should see `widget-cache.json`.

---

## A. Add all three sizes

1. Long-press any empty area on the home screen → **Widgets** (Samsung labels it "Widgets and styles" on One UI 7+).
2. Scroll to **FreshKeep** in the alphabetical list. You should see three entries:
   - "FreshKeep — count of items to use up" (2x2)
   - "FreshKeep — top 3 items by priority" (4x2)
   - "FreshKeep — top 5 items + urgent reason" (4x4)
3. Drag each onto the home screen, ideally on three separate pages so you can compare them side by side.

✅ **Expected:** all three render within 1–2 seconds with real data: emojis, action pills (red/amber/blue/green), days-until-expiry text.

❌ **If a widget shows "Open FreshKeep to load items":** the JSON file isn't where the widget expects. Verify with `adb shell run-as com.owentjandra.freshkeep ls files/widget-cache.json`. If the file exists but the widget still says "load items", the package name mismatched at build time — verify `applicationId` in `android/app/build.gradle` is `com.owentjandra.freshkeep`.

❌ **If you don't see FreshKeep at all in the widget picker:** the receivers didn't register. Check the merged `android/app/src/main/AndroidManifest.xml` after prebuild for the three `<receiver>` blocks.

---

## B. Dark mode

1. Quick settings → enable **Dark mode**.
2. Look at all three widgets.

⚠️ **Known limitation in current code:** the widgets hardcode `Color.White` as background. In dark mode they'll look bright against a dark wallpaper. A proper fix uses Glance's `GlanceTheme`/`MaterialTheme.colorScheme.background` — to be addressed if dark-mode contrast turns out to be a real problem in practice. Not a blocker for Phase 1.

✅ **Expected for now:** widgets are still readable but stand out as bright tiles in dark mode.

---

## C. Cold-start state — before the app has ever been opened

To test: uninstall the app, reinstall via `npx expo run:android`, **don't open the app**, then add the widget.

✅ **Expected:** widget shows "Open FreshKeep to load items" (no JSON cache yet). Tapping it should launch the app via the `freshkeep://(tabs)` deep link.

❌ **If tapping does nothing:** the deep link scheme isn't wired. Check that `app.json` has `"scheme": "freshkeep"` and that the prebuilt manifest contains the launch intent-filter for it.

---

## D. After device restart

1. Add all three widgets.
2. Note the time on the daily 6am refresh — the schedule was set the moment a widget was added.
3. Power the device off completely, wait 10 seconds, power back on.
4. Unlock the device. The widgets should re-render automatically (Android re-renders on boot).

✅ **Expected:**
- Widgets show data (not the cold-start placeholder).
- `BootReceiver` re-arms the daily-6am alarm. You can verify with `adb shell dumpsys alarm | grep freshkeep` — you should see an entry for `RefreshAllWidgetsReceiver`.

❌ **If alarm is missing:** Samsung may have killed the app before `BootReceiver` ran. Check Settings → Apps → FreshKeep → Battery and ensure it's not in "Sleeping apps" or "Deep sleeping apps."

---

## E. Samsung One UI battery optimization — the big one

One UI is more aggressive than stock Android. The relevant settings to whitelist:

### Settings → Battery & device care → Battery → Background usage limits

1. **Sleeping apps** — make sure FreshKeep is **not** in this list.
2. **Deep sleeping apps** — same.
3. **Never sleeping apps** — ideally add FreshKeep here. (Power-user move; not required, but worth it for a hobby app you actually use.)

### Settings → Apps → FreshKeep

1. **Battery → Allow background activity** must be ON.
2. **Battery → Optimize battery usage** — set to **Unrestricted** (or **Optimized** at a minimum; **Restricted** breaks the widget).

### What to expect even with everything correctly configured

- The 30-min `updatePeriodMillis` is a *minimum interval Android promises to honor*, not a maximum. If the device is in Doze, refreshes can be delayed up to ~15 min beyond the interval. Acceptable for a fridge-tracker.
- The 6am alarm is `setInexactRepeating` + `AlarmManager.RTC` (not `RTC_WAKEUP`). It won't wake the device; it'll fire at the next normal wake (when you unlock your phone in the morning). For an MVP this is correct: we don't want to wake the phone at 5:59am to refresh a widget. If you want a guaranteed exact-time fire later, switch to `setExactAndAllowWhileIdle` and request `SCHEDULE_EXACT_ALARM` permission — but that's a big ask of users.
- The "tap to refresh" stale state (>24h since generated_at) is the safety net: even if every refresh path fails, the user knows the widget is showing old data the moment they look at it.

### What you'll need to handle (changes to Step 17/18)

If real-world testing shows the widget regularly going stale on a S25+:

1. **First fix (cheap):** add the user to "Never sleeping apps" — document this as a setup step in the app's onboarding or Profile screen.
2. **Second fix (medium):** add a `WorkManager` periodic worker (`setRequiresBatteryNotLow(false)`, `setRequiresDeviceIdle(false)`). WorkManager handles One UI's quirks better than `AlarmManager.setInexactRepeating` for app-launched scheduling.
3. **Third fix (expensive):** request `SCHEDULE_EXACT_ALARM` and switch to `setExactAndAllowWhileIdle` for the 6am tick. Heavy hand for a refrigerator app — only if (1) and (2) aren't enough.

---

## F. Click-through / deep linking

1. On the medium or large widget, tap an item row.

✅ **Expected:** app opens directly to the Item Detail screen (`freshkeep://item/<id>`), not the home tab.

❌ **If it lands on the home tab:** expo-router isn't matching the URL. Confirm that `app/item/[id].tsx` exists and that `app.json` has `"scheme": "freshkeep"`. You can test the deep link directly: `adb shell am start -W -a android.intent.action.VIEW -d "freshkeep://item/sample-id" com.owentjandra.freshkeep`.

---

## G. Smoke test — end-to-end Phase 1 flow on the device

1. Open app → scan a barcode of something in your fridge.
2. Set details → save.
3. Wait ~30 sec, look at the widget. New item should appear (the JSON was rewritten on item-list refresh; widget catches up on its 30-min schedule).
4. Tap the new item on the widget → Item Detail opens.
5. Tap "Recipe" if it's cookable → Recipe screen renders (needs `ANTHROPIC_API_KEY` set on the backend).
6. Tap "Cooked it" → returns home. Item is now `status='used'` and gone from the widget on next refresh.

If 1–6 all work end-to-end, **Phase 1 is shippable.**

---

## Outstanding gaps to close after this test pass

- Dark-mode widget colors (cosmetic).
- Immediate widget refresh on JSON write (Step 18 known gap — the 30-min ceiling is the workaround).
- Step 14 push notifications (Firebase project still needed).
- Step 15 deploy (Railway/Render decision still needed).
