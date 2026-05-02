// USDA FSIS FoodKeeper data, mirroring backend/src/db/migrations/002_seed_shelf_life_reference.sql.
// Bundled into the JS bundle so the prototype runs fully offline.

export type Location = 'fridge' | 'freezer' | 'counter' | 'pantry';

export type ShelfLifeRow = {
  category: string;
  location: Location;
  opened: boolean;
  days_min: number;
  days_typical: number;
  days_max: number;
  freezable: boolean;
  notes?: string;
};

export const SHELF_LIFE: ShelfLifeRow[] = [
  // Dairy
  { category: 'dairy_milk',         location: 'fridge',  opened: false, days_min:   4, days_typical:   7, days_max:  10, freezable: true  },
  { category: 'dairy_milk',         location: 'fridge',  opened: true,  days_min:   4, days_typical:   7, days_max:  10, freezable: true  },
  { category: 'dairy_milk',         location: 'freezer', opened: false, days_min:  60, days_typical:  90, days_max: 120, freezable: true  },
  { category: 'dairy_milk',         location: 'freezer', opened: true,  days_min:  60, days_typical:  90, days_max: 120, freezable: true  },
  { category: 'dairy_yogurt',       location: 'fridge',  opened: false, days_min:  10, days_typical:  14, days_max:  21, freezable: true  },
  { category: 'dairy_yogurt',       location: 'fridge',  opened: true,  days_min:   5, days_typical:   7, days_max:  10, freezable: true  },
  { category: 'dairy_yogurt',       location: 'freezer', opened: false, days_min:  30, days_typical:  60, days_max:  60, freezable: true  },
  { category: 'dairy_yogurt',       location: 'freezer', opened: true,  days_min:  30, days_typical:  60, days_max:  60, freezable: true  },
  { category: 'dairy_cheese_hard',  location: 'fridge',  opened: false, days_min:  90, days_typical: 180, days_max: 240, freezable: true  },
  { category: 'dairy_cheese_hard',  location: 'fridge',  opened: true,  days_min:  21, days_typical:  28, days_max:  42, freezable: true  },
  { category: 'dairy_cheese_hard',  location: 'freezer', opened: false, days_min: 180, days_typical: 180, days_max: 240, freezable: true  },
  { category: 'dairy_cheese_hard',  location: 'freezer', opened: true,  days_min: 180, days_typical: 180, days_max: 240, freezable: true  },
  { category: 'dairy_cheese_soft',  location: 'fridge',  opened: false, days_min:   7, days_typical:  14, days_max:  21, freezable: false },
  { category: 'dairy_cheese_soft',  location: 'fridge',  opened: true,  days_min:   3, days_typical:   7, days_max:  10, freezable: false },
  { category: 'dairy_butter',       location: 'fridge',  opened: false, days_min:  60, days_typical:  90, days_max: 120, freezable: true  },
  { category: 'dairy_butter',       location: 'fridge',  opened: true,  days_min:  30, days_typical:  30, days_max:  60, freezable: true  },
  { category: 'dairy_butter',       location: 'freezer', opened: false, days_min: 180, days_typical: 270, days_max: 365, freezable: true  },
  { category: 'dairy_butter',       location: 'freezer', opened: true,  days_min: 180, days_typical: 270, days_max: 365, freezable: true  },

  // Meat
  { category: 'meat_chicken',       location: 'fridge',  opened: false, days_min:   1, days_typical:   2, days_max:   3, freezable: true  },
  { category: 'meat_chicken',       location: 'fridge',  opened: true,  days_min:   1, days_typical:   2, days_max:   3, freezable: true  },
  { category: 'meat_chicken',       location: 'freezer', opened: false, days_min: 270, days_typical: 270, days_max: 365, freezable: true  },
  { category: 'meat_chicken',       location: 'freezer', opened: true,  days_min: 270, days_typical: 270, days_max: 365, freezable: true  },
  { category: 'meat_beef',          location: 'fridge',  opened: false, days_min:   3, days_typical:   4, days_max:   5, freezable: true  },
  { category: 'meat_beef',          location: 'fridge',  opened: true,  days_min:   2, days_typical:   3, days_max:   4, freezable: true  },
  { category: 'meat_beef',          location: 'freezer', opened: false, days_min: 180, days_typical: 270, days_max: 365, freezable: true  },
  { category: 'meat_beef',          location: 'freezer', opened: true,  days_min: 180, days_typical: 270, days_max: 365, freezable: true  },
  { category: 'meat_beef_ground',   location: 'fridge',  opened: false, days_min:   1, days_typical:   2, days_max:   2, freezable: true  },
  { category: 'meat_beef_ground',   location: 'fridge',  opened: true,  days_min:   1, days_typical:   2, days_max:   2, freezable: true  },
  { category: 'meat_beef_ground',   location: 'freezer', opened: false, days_min:  90, days_typical: 120, days_max: 120, freezable: true  },
  { category: 'meat_beef_ground',   location: 'freezer', opened: true,  days_min:  90, days_typical: 120, days_max: 120, freezable: true  },
  { category: 'meat_pork',          location: 'fridge',  opened: false, days_min:   3, days_typical:   4, days_max:   5, freezable: true  },
  { category: 'meat_pork',          location: 'fridge',  opened: true,  days_min:   2, days_typical:   3, days_max:   4, freezable: true  },
  { category: 'meat_pork',          location: 'freezer', opened: false, days_min: 120, days_typical: 180, days_max: 180, freezable: true  },
  { category: 'meat_pork',          location: 'freezer', opened: true,  days_min: 120, days_typical: 180, days_max: 180, freezable: true  },
  { category: 'meat_fish',          location: 'fridge',  opened: false, days_min:   1, days_typical:   2, days_max:   2, freezable: true  },
  { category: 'meat_fish',          location: 'fridge',  opened: true,  days_min:   1, days_typical:   1, days_max:   2, freezable: true  },
  { category: 'meat_fish',          location: 'freezer', opened: false, days_min:  90, days_typical: 180, days_max: 240, freezable: true  },
  { category: 'meat_fish',          location: 'freezer', opened: true,  days_min:  90, days_typical: 180, days_max: 240, freezable: true  },

  // Produce
  { category: 'produce_leafy',      location: 'fridge',  opened: false, days_min:   5, days_typical:   7, days_max:  10, freezable: false },
  { category: 'produce_leafy',      location: 'fridge',  opened: true,  days_min:   3, days_typical:   5, days_max:   7, freezable: false },
  { category: 'produce_leafy',      location: 'freezer', opened: false, days_min: 240, days_typical: 270, days_max: 365, freezable: true  },
  { category: 'produce_hard_veg',   location: 'fridge',  opened: false, days_min:  14, days_typical:  21, days_max:  28, freezable: true  },
  { category: 'produce_hard_veg',   location: 'fridge',  opened: true,  days_min:   7, days_typical:  14, days_max:  14, freezable: true  },
  { category: 'produce_hard_veg',   location: 'freezer', opened: false, days_min: 240, days_typical: 270, days_max: 365, freezable: true  },
  { category: 'produce_soft_fruit', location: 'counter', opened: false, days_min:   1, days_typical:   3, days_max:   5, freezable: true  },
  { category: 'produce_soft_fruit', location: 'fridge',  opened: false, days_min:   3, days_typical:   5, days_max:   7, freezable: true  },
  { category: 'produce_soft_fruit', location: 'fridge',  opened: true,  days_min:   2, days_typical:   3, days_max:   5, freezable: true  },
  { category: 'produce_soft_fruit', location: 'freezer', opened: false, days_min: 180, days_typical: 240, days_max: 365, freezable: true  },
  { category: 'produce_hard_fruit', location: 'counter', opened: false, days_min:   7, days_typical:  14, days_max:  21, freezable: false },
  { category: 'produce_hard_fruit', location: 'fridge',  opened: false, days_min:  21, days_typical:  30, days_max:  42, freezable: false },
  { category: 'produce_hard_fruit', location: 'fridge',  opened: true,  days_min:   3, days_typical:   5, days_max:   7, freezable: false },
  { category: 'produce_hard_fruit', location: 'freezer', opened: false, days_min: 240, days_typical: 270, days_max: 365, freezable: true  },
  { category: 'produce_berries',    location: 'fridge',  opened: false, days_min:   3, days_typical:   5, days_max:   7, freezable: true  },
  { category: 'produce_berries',    location: 'fridge',  opened: true,  days_min:   2, days_typical:   3, days_max:   5, freezable: true  },
  { category: 'produce_berries',    location: 'freezer', opened: false, days_min: 180, days_typical: 270, days_max: 365, freezable: true  },

  // Eggs / bread / deli
  { category: 'eggs',               location: 'fridge',  opened: false, days_min:  21, days_typical:  28, days_max:  35, freezable: false },
  { category: 'eggs',               location: 'fridge',  opened: true,  days_min:   2, days_typical:   2, days_max:   4, freezable: false },
  { category: 'eggs',               location: 'freezer', opened: true,  days_min: 365, days_typical: 365, days_max: 365, freezable: true  },
  { category: 'bread',              location: 'counter', opened: false, days_min:   5, days_typical:   7, days_max:  14, freezable: true  },
  { category: 'bread',              location: 'counter', opened: true,  days_min:   5, days_typical:   7, days_max:  14, freezable: true  },
  { category: 'bread',              location: 'fridge',  opened: false, days_min:   7, days_typical:  14, days_max:  21, freezable: true  },
  { category: 'bread',              location: 'fridge',  opened: true,  days_min:   7, days_typical:  14, days_max:  21, freezable: true  },
  { category: 'bread',              location: 'freezer', opened: false, days_min:  60, days_typical:  60, days_max:  90, freezable: true  },
  { category: 'deli',               location: 'fridge',  opened: false, days_min:  14, days_typical:  14, days_max:  21, freezable: true  },
  { category: 'deli',               location: 'fridge',  opened: true,  days_min:   3, days_typical:   4, days_max:   5, freezable: true  },
  { category: 'deli',               location: 'freezer', opened: false, days_min:  30, days_typical:  60, days_max:  60, freezable: true  },

  // Pantry
  { category: 'pantry_dry_goods',   location: 'pantry',  opened: false, days_min: 365, days_typical: 540, days_max: 730, freezable: false },
  { category: 'pantry_dry_goods',   location: 'pantry',  opened: true,  days_min: 180, days_typical: 365, days_max: 365, freezable: false },
  { category: 'pantry_canned',      location: 'pantry',  opened: false, days_min: 365, days_typical: 730, days_max:1095, freezable: false },
  { category: 'pantry_canned',      location: 'fridge',  opened: true,  days_min:   3, days_typical:   5, days_max:   7, freezable: false },
];

export function findShelfLife(
  category: string | null,
  location: Location,
  opened: boolean,
): ShelfLifeRow | null {
  if (!category) return null;
  return (
    SHELF_LIFE.find(r => r.category === category && r.location === location && r.opened === opened) ||
    null
  );
}

export const CATEGORY_OPTIONS: Array<{ value: string; label: string; emoji: string }> = [
  { value: 'dairy_milk',         label: 'Milk',                emoji: '🥛' },
  { value: 'dairy_yogurt',       label: 'Yogurt',              emoji: '🥄' },
  { value: 'dairy_cheese_hard',  label: 'Hard cheese',         emoji: '🧀' },
  { value: 'dairy_cheese_soft',  label: 'Soft cheese',         emoji: '🧀' },
  { value: 'dairy_butter',       label: 'Butter',              emoji: '🧈' },
  { value: 'meat_chicken',       label: 'Chicken',             emoji: '🍗' },
  { value: 'meat_beef',          label: 'Beef (cuts)',         emoji: '🥩' },
  { value: 'meat_beef_ground',   label: 'Ground beef',         emoji: '🥩' },
  { value: 'meat_pork',          label: 'Pork',                emoji: '🥓' },
  { value: 'meat_fish',          label: 'Fish',                emoji: '🐟' },
  { value: 'produce_leafy',      label: 'Leafy greens',        emoji: '🥬' },
  { value: 'produce_hard_veg',   label: 'Hard vegetables',     emoji: '🥕' },
  { value: 'produce_soft_fruit', label: 'Soft fruit',          emoji: '🍑' },
  { value: 'produce_hard_fruit', label: 'Hard fruit',          emoji: '🍎' },
  { value: 'produce_berries',    label: 'Berries',             emoji: '🍓' },
  { value: 'eggs',               label: 'Eggs',                emoji: '🥚' },
  { value: 'bread',              label: 'Bread',               emoji: '🍞' },
  { value: 'deli',               label: 'Deli meat',           emoji: '🥪' },
  { value: 'pantry_dry_goods',   label: 'Dry goods (pantry)',  emoji: '🌾' },
  { value: 'pantry_canned',      label: 'Canned goods',        emoji: '🥫' },
];

export function emojiForCategory(category: string | null): string {
  if (!category) return '🍽️';
  return CATEGORY_OPTIONS.find(o => o.value === category)?.emoji ?? '🍽️';
}
