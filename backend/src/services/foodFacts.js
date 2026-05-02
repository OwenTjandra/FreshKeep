// Open Food Facts client + category mapping.
// API docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
// OFF asks for a descriptive User-Agent identifying our app.

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product/';

function userAgent() {
  return process.env.OPEN_FOOD_FACTS_USER_AGENT || 'FreshKeep/0.1';
}

/**
 * Fetch a product from Open Food Facts.
 * Returns null if the barcode is unknown.
 */
export async function fetchProduct(barcode) {
  const url = `${OFF_BASE}${encodeURIComponent(barcode)}.json`;
  const res = await fetch(url, { headers: { 'User-Agent': userAgent() } });

  // OFF returns 404 for unknown barcodes in v2.
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Open Food Facts error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  // v2 also indicates not-found via status: 0 in some cases.
  if (!data || data.status === 0 || !data.product) return null;

  const p = data.product;
  return {
    name: p.product_name || null,
    brand: (p.brands || '').split(',')[0].trim() || null,
    categoriesTags: Array.isArray(p.categories_tags) ? p.categories_tags : [],
    raw: p,
  };
}

// Ordered rules. First match wins. Order matters because some categories
// share keywords (e.g. "ground-beef" must be checked before generic "beef").
const CATEGORY_RULES = [
  // Dairy
  ['dairy_yogurt',       ['yogurt', 'yoghurt']],
  ['dairy_cheese_hard',  ['cheddar', 'parmesan', 'parmigiano', 'gouda', 'gruyere', 'manchego', 'pecorino', 'emmental', 'hard-cheese']],
  ['dairy_cheese_soft',  ['brie', 'camembert', 'ricotta', 'cottage-cheese', 'cream-cheese', 'feta', 'mozzarella', 'soft-cheese']],
  ['dairy_butter',       ['butter']],
  ['dairy_milk',         ['milk']], // checked after yogurt/butter to avoid "buttermilk", "yogurt drinks"

  // Meat — order: more specific first
  ['meat_beef_ground',   ['ground-beef', 'minced-beef', 'hamburger-meat']],
  ['meat_chicken',       ['chicken', 'poultry']],
  ['meat_pork',          ['pork', 'bacon', 'sausage', 'ham']],
  ['meat_fish',          ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'haddock', 'mackerel']],
  ['meat_beef',          ['beef', 'steak']],
  ['deli',               ['deli', 'lunch-meat', 'cold-cut', 'sliced-meat']],

  // Eggs / bread
  ['eggs',               ['egg', 'eggs']],
  ['bread',              ['bread', 'baguette', 'loaf', 'brioche', 'sourdough', 'rolls']],

  // Produce — berries / leafy / hard veg / soft fruit / hard fruit
  ['produce_berries',    ['berry', 'berries', 'strawberr', 'blueberr', 'raspberr', 'blackberr']],
  ['produce_leafy',      ['leafy', 'spinach', 'lettuce', 'kale', 'arugula', 'rocket', 'romaine', 'mixed-greens']],
  ['produce_hard_veg',   ['carrot', 'broccoli', 'celery', 'cabbage', 'cauliflower', 'brussels-sprout']],
  ['produce_soft_fruit', ['peach', 'plum', 'tomato', 'avocado', 'mango', 'nectarine', 'apricot']],
  ['produce_hard_fruit', ['apple', 'pear']],

  // Pantry
  ['pantry_canned',      ['canned', 'tinned']],
  ['pantry_dry_goods',   ['rice', 'pasta', 'noodles', 'flour', 'sugar', 'cereal', 'oats', 'lentil', 'bean']],
];

/**
 * Map Open Food Facts category tags (e.g. ["en:dairies", "en:milks", "en:cow-milks"])
 * to our internal taxonomy. Returns null if no rule matches.
 *
 * Pure function — easy to unit test in Step 5.
 */
export function mapCategory(offCategoriesTags) {
  if (!Array.isArray(offCategoriesTags) || offCategoriesTags.length === 0) {
    return null;
  }
  const haystack = offCategoriesTags.join(' ').toLowerCase();
  for (const [ourCategory, keywords] of CATEGORY_RULES) {
    for (const kw of keywords) {
      if (haystack.includes(kw)) return ourCategory;
    }
  }
  return null;
}
