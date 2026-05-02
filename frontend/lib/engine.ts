// Expiration intelligence engine — TS port of backend/src/services/expirationIntelligence.js.
// Pure & synchronous so it can run on-device.
//
// See backend file for the canonical decision tree and 22 unit tests.

export const COOKABLE_CATEGORIES = new Set([
  'meat_chicken', 'meat_beef', 'meat_beef_ground', 'meat_pork', 'meat_fish',
  'produce_leafy', 'produce_hard_veg', 'produce_soft_fruit', 'produce_berries',
  'eggs', 'bread', 'pantry_dry_goods',
]);

// Categories where freezing destroys quality (or is unsafe in the form
// users typically buy them — eggs in shell, lettuce, apples). The engine
// will not recommend "Mark frozen" for these.
const NOT_FREEZABLE_CATEGORIES = new Set([
  'dairy_cheese_soft',
  'pantry_dry_goods',
  'pantry_canned',
  'eggs',                // can only freeze beaten, not in shell
  'produce_leafy',       // gets soggy when thawed
  'produce_hard_fruit',  // mushy when thawed (apples, pears)
]);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type EngineInput = {
  location: 'fridge' | 'freezer' | 'counter' | 'pantry';
  category?: string | null;
  days_until_expiry: number;
  freezable?: boolean | null;
  user_marked_fine_at?: string | Date | null;
};

export type EngineUser = { fridge_temp_setting?: number };

export type EngineOutput = {
  action: 'eat_now' | 'eat_soon' | 'freeze_now' | 'use_in_recipe' | 'compost' | 'monitor' | 'safe';
  priority: number;
  reason: string;
};

export function fridgeTempMultiplier(tempF: number | undefined): number {
  if (typeof tempF !== 'number' || Number.isNaN(tempF)) return 1.0;
  if (tempF <= 35) return 1.15;
  if (tempF <= 38) return 1.0;
  if (tempF <= 40) return 0.85;
  return 0.7;
}

export function effectiveDays(item: EngineInput, user?: EngineUser): number {
  const days = item.days_until_expiry;
  if (item.location !== 'fridge') return days;
  if (days < 0) return days;
  if (!user || typeof user.fridge_temp_setting !== 'number') return days;
  return Math.floor(days * fridgeTempMultiplier(user.fridge_temp_setting));
}

export function computeRecommendedAction(item: EngineInput | null, user?: EngineUser): EngineOutput | null {
  if (!item || typeof item.days_until_expiry !== 'number') return null;

  const { location, category } = item;
  const days = effectiveDays(item, user);
  const cookable = !!category && COOKABLE_CATEGORIES.has(category);
  const freezable = isFreezable(item);

  if (location === 'freezer') {
    return { action: 'safe', priority: 5, reason: 'Frozen — long-term safe.' };
  }

  if (days < 0) {
    if (withinFineGrace(item.user_marked_fine_at ?? null)) {
      return { action: 'monitor', priority: 3, reason: 'You said it still looks fine — recheck tomorrow.' };
    }
    return { action: 'compost', priority: 1, reason: 'Past expiry — toss it or check carefully before eating.' };
  }

  if (days <= 1) {
    if (cookable) return { action: 'use_in_recipe', priority: 1, reason: 'Cook tonight — turn it into a recipe before it goes.' };
    return { action: 'eat_now', priority: 1, reason: days <= 0 ? 'Eat today!' : 'Eat tomorrow.' };
  }

  if (days <= 3) {
    if (cookable) return { action: 'use_in_recipe', priority: 2, reason: 'Cook this week — recipe coming.' };
    return { action: 'eat_soon', priority: 2, reason: `Use within ${days} days.` };
  }

  if (days <= 5 && freezable) {
    return { action: 'freeze_now', priority: 2, reason: 'Freezable — freeze now to buy yourself months.' };
  }

  if (days <= 7) {
    return { action: 'eat_soon', priority: 2, reason: 'Use this week.' };
  }

  return { action: 'safe', priority: 5, reason: 'All good.' };
}

function isFreezable(item: EngineInput): boolean {
  if (typeof item.freezable === 'boolean') return item.freezable;
  if (item.category && NOT_FREEZABLE_CATEGORIES.has(item.category)) return false;
  return true;
}

function withinFineGrace(markedAt: string | Date | null): boolean {
  if (!markedAt) return false;
  const t = markedAt instanceof Date ? markedAt.getTime() : new Date(markedAt).getTime();
  if (Number.isNaN(t)) return false;
  const ageMs = Date.now() - t;
  return ageMs >= 0 && ageMs < ONE_DAY_MS;
}
