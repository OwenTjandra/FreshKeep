// Expiration intelligence engine — pure, synchronous, no I/O.
//
// Decision tree (top to bottom — first match wins). See README for prose.
//   1. location='freezer'                                 → safe        (5)
//   2. past expiry, marked-fine within 24h                → monitor     (3)
//   3. past expiry                                        → compost     (1)
//   4. ≤1 day & cookable                                  → use_in_recipe (1)
//   5. ≤1 day                                             → eat_now     (1)
//   6. ≤3 days & cookable                                 → use_in_recipe (2)
//   7. ≤3 days                                            → eat_soon    (2)
//   8. 4–5 days & freezable & not in freezer              → freeze_now  (2)
//   9. 4–7 days                                           → eat_soon    (2)
//  10. >7 days                                            → safe        (5)
//
// Fridge-temp multiplier (Step 6) is applied INSIDE the engine, only for
// items where location='fridge' and days_until_expiry >= 0. Past-expiry
// items are not adjusted (a cold fridge can't un-expire something).

export const COOKABLE_CATEGORIES = new Set([
  'meat_chicken',
  'meat_beef',
  'meat_beef_ground',
  'meat_pork',
  'meat_fish',
  'produce_leafy',
  'produce_hard_veg',
  'produce_soft_fruit',
  'produce_berries',
  'eggs',
  'bread',
  'pantry_dry_goods',
]);

// Categories where freezing destroys quality enough that we won't recommend it,
// even if the item is technically safe to freeze. Used as a fallback when
// the items service hasn't enriched the row with `freezable` from the JOIN.
const NOT_FREEZABLE_CATEGORIES = new Set([
  'dairy_cheese_soft',
  'pantry_dry_goods',
  'pantry_canned',
]);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Step 6 multiplier table. Values are educated starting estimates per the user's
 * spec — tune them once we have real spoilage data (Step 20's Bayesian adjuster).
 *
 *   ≤35°F → 1.15x   (cold fridge — 15% more shelf life)
 *   36–38°F → 1.0x  (USDA-recommended — baseline)
 *   39–40°F → 0.85x (slightly warm — 15% less)
 *   ≥41°F → 0.7x    (warm — 30% less)
 */
export function fridgeTempMultiplier(tempF) {
  if (typeof tempF !== 'number' || Number.isNaN(tempF)) return 1.0;
  if (tempF <= 35) return 1.15;
  if (tempF <= 38) return 1.0;
  if (tempF <= 40) return 0.85;
  return 0.7;
}

/**
 * Adjust days_until_expiry by the fridge-temp multiplier.
 * Only applies to fridge items with non-negative days. Math.floor errs
 * toward urgency (food-safety conservative).
 */
export function effectiveDays(item, user) {
  const days = item.days_until_expiry;
  if (item.location !== 'fridge') return days;
  if (days < 0) return days;
  if (!user || typeof user.fridge_temp_setting !== 'number') return days;
  return Math.floor(days * fridgeTempMultiplier(user.fridge_temp_setting));
}

/**
 * @param {object} item
 *   @prop {string} location          one of fridge|freezer|counter|pantry
 *   @prop {string} [category]        e.g. 'dairy_milk'
 *   @prop {number} days_until_expiry integer; negative means past expiry
 *   @prop {boolean} [freezable]      authoritative when present (from SQL JOIN)
 *   @prop {string|Date|null} [user_marked_fine_at]  ISO string, Date, or null
 * @param {object} [user]              user record; uses fridge_temp_setting for the Step 6 multiplier
 * @returns {{ action: string, priority: number, reason: string } | null}
 */
export function computeRecommendedAction(item, user) {
  if (!item || typeof item.days_until_expiry !== 'number') return null;

  const { location, category } = item;
  const days = effectiveDays(item, user);
  const cookable = !!category && COOKABLE_CATEGORIES.has(category);
  const freezable = isFreezable(item);

  // 1. Frozen items are safe by virtue of location, regardless of expiry_date.
  if (location === 'freezer') {
    return { action: 'safe', priority: 5, reason: 'Frozen — long-term safe.' };
  }

  // 2 & 3. Past expiry: monitor (24h grace if user said it looks fine), else compost.
  if (days < 0) {
    if (withinFineGrace(item.user_marked_fine_at)) {
      return {
        action: 'monitor',
        priority: 3,
        reason: 'You said it still looks fine — recheck tomorrow.',
      };
    }
    return {
      action: 'compost',
      priority: 1,
      reason: 'Past expiry — toss it or check carefully before eating.',
    };
  }

  // 4 & 5. 0–1 days
  if (days <= 1) {
    if (cookable) {
      return {
        action: 'use_in_recipe',
        priority: 1,
        reason: 'Cook tonight — turn it into a recipe before it goes.',
      };
    }
    return {
      action: 'eat_now',
      priority: 1,
      reason: days <= 0 ? 'Eat today!' : 'Eat tomorrow.',
    };
  }

  // 6 & 7. 2–3 days
  if (days <= 3) {
    if (cookable) {
      return {
        action: 'use_in_recipe',
        priority: 2,
        reason: `Cook this week — recipe coming.`,
      };
    }
    return {
      action: 'eat_soon',
      priority: 2,
      reason: `Use within ${days} days.`,
    };
  }

  // 8. 4–5 days, freezable, not in freezer
  if (days <= 5 && freezable) {
    return {
      action: 'freeze_now',
      priority: 2,
      reason: 'Freezable — freeze now to buy yourself months.',
    };
  }

  // 9. 4–7 days (catches both non-freezable in 4–5 and the 6–7 window)
  if (days <= 7) {
    return { action: 'eat_soon', priority: 2, reason: 'Use this week.' };
  }

  // 10. >7 days
  return { action: 'safe', priority: 5, reason: 'All good.' };
}

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

function isFreezable(item) {
  // Authoritative value from shelf_life_reference (when items service enriches)
  if (typeof item.freezable === 'boolean') return item.freezable;
  if (item.category && NOT_FREEZABLE_CATEGORIES.has(item.category)) return false;
  // Default: most fresh foods are freezable for our purposes.
  return true;
}

function withinFineGrace(markedAt) {
  if (!markedAt) return false;
  const t = markedAt instanceof Date ? markedAt.getTime() : new Date(markedAt).getTime();
  if (Number.isNaN(t)) return false;
  const ageMs = Date.now() - t;
  return ageMs >= 0 && ageMs < ONE_DAY_MS;
}
