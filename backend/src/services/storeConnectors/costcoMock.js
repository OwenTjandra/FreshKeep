// Costco mock connector (Step 22).
//
// Real plan for Costco:
//   - There is no public per-customer purchases API for individuals.
//   - Future paths (in priority order):
//       1. Receipt OCR via Claude Sonnet 4.5 vision (Step 25). User snaps
//          a photo of their Costco receipt; we parse the line items and
//          run them through the same import pipeline this mock feeds.
//       2. A real B2B partnership with Costco for scoped read access to
//          a member's purchase history. Out of scope without business dev.
//   - Reverse-engineering Costco's customer site is TOS-violating; not pursuing.
//
// Why this mock exists:
//   - The whole *pipeline* (sync → store_imports rows → user confirms via
//     dual-date picker → real items appear) is the valuable bit. The mock
//     gives us a 14-line fixture so we can build that pipeline (Steps 23, 24)
//     without waiting on (1) or (2) above.

export const slug = 'costco';
export const name = 'Costco';
export const integrationType = 'mock';

/**
 * No actual auth — the mock connector accepts any input and returns null.
 * For a real OAuth connector, this would do the OAuth dance and return
 * the tokens to store in store_connections.auth_tokens.
 */
// eslint-disable-next-line no-unused-vars
export async function connect(_user, _body) {
  return { external_account_id: 'mock-member-12345', auth_tokens: null };
}

/**
 * Returns 14 hardcoded line items. Eggs has TWO possible expiry dates per
 * the user's spec (sell-by date the carton prints + the USDA "still safe
 * past sell-by" extension). Everything else has a single best-guess date.
 *
 * Days are relative to NOW so the imports always look like a fresh trip.
 */
// eslint-disable-next-line no-unused-vars
export async function sync(_connection) {
  return MOCK_LINES.map(buildLine);
}

// ─── Line-item template ─────────────────────────────────────────

const MOCK_LINES = [
  { name: 'Whole milk',                             category: 'dairy_milk',         qty: 1, days: [10] },
  { name: 'Kirkland eggs (24 ct, large)',           category: 'eggs',               qty: 1, days: [21, 35] }, // ← TWO dates
  { name: 'Kirkland Greek yogurt (32 oz)',          category: 'dairy_yogurt',       qty: 1, days: [21] },
  { name: 'Tillamook sharp cheddar (2 lb block)',   category: 'dairy_cheese_hard',  qty: 1, days: [180] },
  { name: 'Boneless skinless chicken breast (6 lb)',category: 'meat_chicken',       qty: 1, days: [2] },
  { name: 'Ground beef 80/20 (5 lb)',               category: 'meat_beef_ground',   qty: 1, days: [2] },
  { name: 'Atlantic salmon fillet (~3 lb)',         category: 'meat_fish',          qty: 1, days: [2] },
  { name: 'Organic baby spinach (16 oz)',           category: 'produce_leafy',      qty: 1, days: [7] },
  { name: 'Gala apples (5 lb bag)',                 category: 'produce_hard_fruit', qty: 1, days: [30] },
  { name: 'Driscolls strawberries (2 lb)',          category: 'produce_berries',    qty: 1, days: [5] },
  { name: 'La Brea sourdough loaves (2-pack)',      category: 'bread',              qty: 1, days: [7] },
  { name: 'Kirkland olive oil (3 L)',               category: 'pantry_dry_goods',   qty: 1, days: [540] },
  { name: 'Garofalo penne (12-pack)',               category: 'pantry_dry_goods',   qty: 1, days: [730] },
  { name: 'S&W black beans (8-pack 15 oz cans)',    category: 'pantry_canned',      qty: 8, days: [1095] },
];

function buildLine(template) {
  const expiryOptions = template.days.map(d => daysFromNow(d));
  return {
    name: template.name,
    barcode: null,
    category: template.category,
    quantity: template.qty,
    expiry_date_options: expiryOptions,
    default_expiry_date: expiryOptions[0],
    raw: { source: 'costco-mock', original: template },
  };
}

function daysFromNow(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
