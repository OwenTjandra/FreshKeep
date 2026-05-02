// Façade — keeps the same call signatures the screens were using when this
// file was an HTTP client, but now delegates to local storage. Recipe calls
// go direct to Anthropic with the user's key (saved in Profile).
//
// To re-enable the cloud backend later, swap implementations here back to
// fetch() against EXPO_PUBLIC_API_URL — no screen code needs to change.

import * as storage from './storage';
import type { EnrichedItem } from './storage';

// ─── Types re-exported so screens still import them from './api' ─────
export type ItemLocation = storage.StoredItem['location'];

export type Item = EnrichedItem;

export type ShelfLife = {
  days_min: number;
  days_typical: number;
  days_max: number;
  freezable: boolean;
  source: string;
  based_on: { location: string; opened: boolean };
};

export type ScanResult =
  | {
      found: true;
      barcode: string;
      name: string | null;
      brand: string | null;
      category: string | null;
      shelf_life: ShelfLife | null;
      cached: boolean;
      manual_entry_required: boolean;
    }
  | {
      found: false;
      barcode: string;
      manual_entry_required: true;
    };

export type RecipeIngredient = { name: string; amount: string; expiring: boolean };
export type RecipeResponse =
  | { type: 'recipe'; title: string; time: string; difficulty: 'easy' | 'medium' | 'hard'; ingredients: RecipeIngredient[]; steps: string[] }
  | { type: 'reminder'; title: string; tip: string };

export type Me = {
  id: string;
  email: string | null;
  fridge_temp_setting: number;
  onboarded_at: string | null;
};

// ─── Items ───────────────────────────────────────────────────────────
export const listItems    = storage.listItems;
export const getItem      = storage.getItem;
export const createItem   = storage.createItem;
export const updateItem   = storage.updateItem;
export const deleteItem   = storage.deleteItem;
export const markItemOpened    = storage.markItemOpened;
export const markItemStillFine = storage.markItemStillFine;

// ─── User ────────────────────────────────────────────────────────────
export async function getMe(): Promise<Me> {
  const u = await storage.getMe();
  return {
    id: 'local',
    email: 'you@local',
    fridge_temp_setting: u.fridge_temp_setting,
    onboarded_at: u.onboarded_at,
  };
}

export async function updateMe(patch: { fridge_temp_setting?: number; onboarded?: boolean }): Promise<Me> {
  const merged = await storage.updateMe({
    ...(patch.fridge_temp_setting !== undefined ? { fridge_temp_setting: patch.fridge_temp_setting } : {}),
    ...(patch.onboarded ? { onboarded_at: new Date().toISOString() } : {}),
  });
  return {
    id: 'local',
    email: 'you@local',
    fridge_temp_setting: merged.fridge_temp_setting,
    onboarded_at: merged.onboarded_at,
  };
}

// ─── Barcode scan — direct to Open Food Facts (no auth) ──────────────
import { findShelfLife } from './shelfLifeData';

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product/';

// Hardcoded prototype barcode — guaranteed to work for demos even if OFF
// is offline. Use 0000000000000 ("Demo: Whole milk") in any scan input
// to step through the full lookup → Set Details → save flow.
export const PROTOTYPE_BARCODE = '0000000000000';

const PROTOTYPE_PRODUCT = {
  name:     'Demo: Whole milk',
  brand:    'FreshKeep Demo',
  category: 'dairy_milk' as const,
};

export async function scanBarcode(barcode: string): Promise<ScanResult> {
  // 1. Prototype barcode — never hits the network. Demo-friendly.
  if (barcode === PROTOTYPE_BARCODE) {
    const shelf = findShelfLife(PROTOTYPE_PRODUCT.category, 'fridge', false);
    return {
      found: true,
      barcode,
      name: PROTOTYPE_PRODUCT.name,
      brand: PROTOTYPE_PRODUCT.brand,
      category: PROTOTYPE_PRODUCT.category,
      shelf_life: shelf ? {
        days_min: shelf.days_min,
        days_typical: shelf.days_typical,
        days_max: shelf.days_max,
        freezable: shelf.freezable,
        source: 'Prototype demo barcode',
        based_on: { location: 'fridge', opened: false },
      } : null,
      cached: true,
      manual_entry_required: false,
    };
  }

  // 2. Local items — if user added this barcode manually, recognize instantly.
  const local = await listItems({ status: 'all' });
  const known = local.items.find(i => i.barcode === barcode);
  if (known) {
    const shelf = known.category ? findShelfLife(known.category, 'fridge', false) : null;
    return {
      found: true,
      barcode,
      name: known.name,
      brand: null,
      category: known.category,
      shelf_life: shelf ? {
        days_min: shelf.days_min,
        days_typical: shelf.days_typical,
        days_max: shelf.days_max,
        freezable: shelf.freezable,
        source: 'You added this manually before',
        based_on: { location: 'fridge', opened: false },
      } : null,
      cached: true,
      manual_entry_required: false,
    };
  }

  // 3. Open Food Facts — public API, no auth needed.
  try {
    // Note: User-Agent is a forbidden header in browsers — the browser sets
    // its own; we just rely on that. On native it's fine to omit too.
    const res = await fetch(`${OFF_BASE}${encodeURIComponent(barcode)}.json`);
    if (res.status === 404) return { found: false, barcode, manual_entry_required: true };
    if (!res.ok) throw new Error(`Open Food Facts ${res.status}`);
    const data = await res.json();
    if (!data || data.status === 0 || !data.product) {
      return { found: false, barcode, manual_entry_required: true };
    }
    const p = data.product;
    const tags: string[] = Array.isArray(p.categories_tags) ? p.categories_tags : [];
    const category = mapCategory(tags);
    const shelf = category ? findShelfLife(category, 'fridge', false) : null;
    return {
      found: true,
      barcode,
      name: p.product_name || null,
      brand: (p.brands || '').split(',')[0].trim() || null,
      category,
      shelf_life: shelf ? {
        days_min: shelf.days_min,
        days_typical: shelf.days_typical,
        days_max: shelf.days_max,
        freezable: shelf.freezable,
        source: 'USDA FSIS FoodKeeper',
        based_on: { location: 'fridge', opened: false },
      } : null,
      cached: false,
      manual_entry_required: !category,
    };
  } catch {
    return { found: false, barcode, manual_entry_required: true };
  }
}

const CATEGORY_RULES: Array<[string, string[]]> = [
  ['dairy_yogurt',       ['yogurt', 'yoghurt']],
  ['dairy_cheese_hard',  ['cheddar', 'parmesan', 'parmigiano', 'gouda', 'gruyere', 'manchego', 'pecorino', 'emmental', 'hard-cheese']],
  ['dairy_cheese_soft',  ['brie', 'camembert', 'ricotta', 'cottage-cheese', 'cream-cheese', 'feta', 'mozzarella', 'soft-cheese']],
  ['dairy_butter',       ['butter']],
  ['dairy_milk',         ['milk']],
  ['meat_beef_ground',   ['ground-beef', 'minced-beef', 'hamburger-meat']],
  ['meat_chicken',       ['chicken', 'poultry']],
  ['meat_pork',          ['pork', 'bacon', 'sausage', 'ham']],
  ['meat_fish',          ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'haddock', 'mackerel']],
  ['meat_beef',          ['beef', 'steak']],
  ['deli',               ['deli', 'lunch-meat', 'cold-cut', 'sliced-meat']],
  ['eggs',               ['egg', 'eggs']],
  ['bread',              ['bread', 'baguette', 'loaf', 'brioche', 'sourdough', 'rolls']],
  ['produce_berries',    ['berry', 'berries', 'strawberr', 'blueberr', 'raspberr', 'blackberr']],
  ['produce_leafy',      ['leafy', 'spinach', 'lettuce', 'kale', 'arugula', 'rocket', 'romaine', 'mixed-greens']],
  ['produce_hard_veg',   ['carrot', 'broccoli', 'celery', 'cabbage', 'cauliflower', 'brussels-sprout']],
  ['produce_soft_fruit', ['peach', 'plum', 'tomato', 'avocado', 'mango', 'nectarine', 'apricot']],
  ['produce_hard_fruit', ['apple', 'pear']],
  ['pantry_canned',      ['canned', 'tinned']],
  ['pantry_dry_goods',   ['rice', 'pasta', 'noodles', 'flour', 'sugar', 'cereal', 'oats', 'lentil', 'bean']],
];

function mapCategory(tags: string[]): string | null {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  const haystack = tags.join(' ').toLowerCase();
  for (const [ourCategory, keywords] of CATEGORY_RULES) {
    for (const kw of keywords) {
      if (haystack.includes(kw)) return ourCategory;
    }
  }
  return null;
}

// ─── Recipes — direct to Anthropic, key from Profile ─────────────────
import { COOKABLE_CATEGORIES } from './engine';

export async function suggestRecipe(itemId: string): Promise<RecipeResponse> {
  const item = await getItem(itemId);
  if (!item.category || !COOKABLE_CATEGORIES.has(item.category)) {
    return reminderForItem(item);
  }
  const user = await storage.getMe();
  const apiKey = user.anthropic_api_key;
  if (!apiKey) {
    throw new Error('Set your Anthropic API key in Profile first to enable recipe suggestions.');
  }

  const SYSTEM = `You are a helpful cooking assistant for FreshKeep, an app that helps users use up ingredients before they spoil.

Suggest exactly ONE simple recipe (≤30 min, easy/medium) using the user's expiring ingredient and these pantry staples: garlic, olive oil, salt, pepper, onion, eggs, rice, pasta.

If recommended_action is "freeze_now", prefer batch-cook recipes that freeze well.

Mark each ingredient with "expiring": true if it's the user's tracked item, false otherwise. Steps should be concise — one short sentence each, 4–8 steps.`;

  const TOOL = {
    name: 'suggest_recipe',
    description: 'Return a single recipe.',
    input_schema: {
      type: 'object',
      properties: {
        title:      { type: 'string' },
        time:       { type: 'string' },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' }, amount: { type: 'string' }, expiring: { type: 'boolean' },
            },
            required: ['name', 'amount', 'expiring'],
          },
        },
        steps: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'time', 'difficulty', 'ingredients', 'steps'],
    },
  };

  const userMsg =
    `Item: ${item.name}\n` +
    `Category: ${item.category}\n` +
    `Recommended action: ${item.recommended_action}\n` +
    `Days until expiry: ${item.days_until_expiry}\n` +
    `Currently ${item.opened ? 'opened' : 'unopened'} in the ${item.location}.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
      // Required when calling Anthropic directly from a browser.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'suggest_recipe' },
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const toolUse = (data.content || []).find((c: any) => c.type === 'tool_use');
  if (!toolUse) throw new Error('No tool_use block in Anthropic response');
  return { type: 'recipe', ...(toolUse.input as any) };
}

function reminderForItem(item: { name: string; category: string | null }): RecipeResponse {
  const tips: Record<string, string> = {
    dairy_milk:        'Drink as-is, add to coffee or smoothies, or use in cereal.',
    dairy_yogurt:      'Have it for breakfast with fruit and granola, or use as a marinade base.',
    dairy_cheese_hard: 'Grate over pasta or rice, melt on toast, or add to a charcuterie board.',
    dairy_cheese_soft: 'Spread on crackers, dollop on a salad, or warm and dip with bread.',
    dairy_butter:      'Use generously when cooking, on toast, or in baking.',
    produce_hard_fruit:'Eat fresh with peanut butter, slice into oatmeal, or add to a salad.',
    deli:              'Build a sandwich, wrap it, or chop into a salad.',
    pantry_canned:     'Once opened, transfer to a container and use within 3–5 days.',
  };
  return {
    type: 'reminder',
    title: `Use up your ${item.name}`,
    tip: (item.category && tips[item.category]) || 'Use this item soon to avoid waste.',
  };
}

// ─── No-op stubs for token registration / test push (kept so screens compile)
export async function registerFcmToken(_t: string, _l?: string) { return { ok: true as const }; }
export async function sendTestNotification() { return { sent: false, reason: 'local-only prototype' as string }; }
