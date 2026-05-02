// Shared widget cache.
//
// The Android home-screen widget (Steps 16–19) reads from this file to
// render its tiles. The app rewrites it whenever items load on Home.
//
// ────── File location ──────
// We write to expo-file-system's documentDirectory, which on Android maps
// to the app's internal files directory:
//   /data/data/com.owentjandra.freshkeep/files/<expo-resolves-here>/widget-cache.json
// On a development build (not Expo Go), this is exactly:
//   <Context.getFilesDir()>/widget-cache.json
// The widget Kotlin code (Step 17) reads from `context.filesDir + '/widget-cache.json'`.
//
// ────── Schema (v1) ──────
// {
//   "version": 1,
//   "generated_at": "2026-05-02T10:30:00.000Z",
//   "items": [
//     {
//       "id":                "uuid",
//       "name":              "Whole milk",
//       "emoji":             "🥛",
//       "days_until_expiry": 1,
//       "action":            "eat_now",
//       "priority":          1,
//       "reason":            "Eat today!"
//     },
//     ... up to 5 entries, sorted by (priority asc, days_until_expiry asc)
//   ]
// }
//
// Bumping the schema: increment `version` and update the widget Kotlin parser.

import * as FileSystem from 'expo-file-system';

import type { Item } from './api';

export const WIDGET_CACHE_FILENAME = 'widget-cache.json';
export const WIDGET_CACHE_PATH = `${FileSystem.documentDirectory}${WIDGET_CACHE_FILENAME}`;
export const WIDGET_CACHE_SCHEMA_VERSION = 1;

export type WidgetCacheItem = {
  id: string;
  name: string;
  emoji: string;
  days_until_expiry: number;
  action: NonNullable<Item['recommended_action']>;
  priority: number;
  reason: string;
};

export type WidgetCache = {
  version: number;
  generated_at: string;
  items: WidgetCacheItem[];
};

/**
 * Build the top-5 widget payload from a full items list and write it to disk.
 * Only items with a non-null recommended_action are eligible.
 */
export async function writeWidgetCache(items: Item[]): Promise<void> {
  const ranked = items
    .filter(i => i.recommended_action && i.action_priority !== null)
    .sort((a, b) => {
      const pa = a.action_priority ?? 99;
      const pb = b.action_priority ?? 99;
      if (pa !== pb) return pa - pb;
      return a.days_until_expiry - b.days_until_expiry;
    })
    .slice(0, 5)
    .map<WidgetCacheItem>((i) => ({
      id: i.id,
      name: i.name,
      emoji: emojiForCategory(i.category),
      days_until_expiry: i.days_until_expiry,
      action: i.recommended_action!,
      priority: i.action_priority!,
      reason: i.action_reason ?? '',
    }));

  const payload: WidgetCache = {
    version: WIDGET_CACHE_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    items: ranked,
  };

  await FileSystem.writeAsStringAsync(WIDGET_CACHE_PATH, JSON.stringify(payload));
}

/**
 * Map our internal category taxonomy → an emoji for the widget UI.
 * Falls back to a neutral 🍽️ for uncategorized items.
 */
function emojiForCategory(category: string | null): string {
  if (!category) return '🍽️';
  const map: Record<string, string> = {
    dairy_milk:         '🥛',
    dairy_yogurt:       '🥄',
    dairy_cheese_hard:  '🧀',
    dairy_cheese_soft:  '🧀',
    dairy_butter:       '🧈',
    meat_chicken:       '🍗',
    meat_beef:          '🥩',
    meat_beef_ground:   '🥩',
    meat_pork:          '🥓',
    meat_fish:          '🐟',
    produce_leafy:      '🥬',
    produce_hard_veg:   '🥕',
    produce_soft_fruit: '🍑',
    produce_hard_fruit: '🍎',
    produce_berries:    '🍓',
    eggs:               '🥚',
    bread:              '🍞',
    deli:               '🥪',
    pantry_dry_goods:   '🌾',
    pantry_canned:      '🥫',
  };
  return map[category] ?? '🍽️';
}
