import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeRecommendedAction,
  fridgeTempMultiplier,
  effectiveDays,
} from '../expirationIntelligence.js';

// Helper to build a minimal item.
function item(overrides) {
  return {
    location: 'fridge',
    category: 'dairy_milk',
    days_until_expiry: 10,
    opened: false,
    ...overrides,
  };
}

// ───────────────────────────────────────────────────────────
// Frozen items
// ───────────────────────────────────────────────────────────

test('frozen item with far-future expiry → safe', () => {
  const r = computeRecommendedAction(item({ location: 'freezer', days_until_expiry: 90 }));
  assert.equal(r.action, 'safe');
  assert.equal(r.priority, 5);
});

test('frozen item that is technically past expiry → still safe (location wins)', () => {
  const r = computeRecommendedAction(item({ location: 'freezer', days_until_expiry: -5 }));
  assert.equal(r.action, 'safe');
});

// ───────────────────────────────────────────────────────────
// Past-expiry edge cases
// ───────────────────────────────────────────────────────────

test('past expiry with no override → compost', () => {
  const r = computeRecommendedAction(item({ days_until_expiry: -2 }));
  assert.equal(r.action, 'compost');
  assert.equal(r.priority, 1);
});

test('past expiry, user marked fine 1 hour ago → monitor', () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const r = computeRecommendedAction(item({
    days_until_expiry: -1,
    user_marked_fine_at: oneHourAgo,
  }));
  assert.equal(r.action, 'monitor');
  assert.equal(r.priority, 3);
});

test('past expiry, user marked fine 25 hours ago → compost (grace expired)', () => {
  const longAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
  const r = computeRecommendedAction(item({
    days_until_expiry: -1,
    user_marked_fine_at: longAgo,
  }));
  assert.equal(r.action, 'compost');
});

// ───────────────────────────────────────────────────────────
// Urgent (0–1 days)
// ───────────────────────────────────────────────────────────

test('expires today, non-cookable yogurt → eat_now', () => {
  const r = computeRecommendedAction(item({
    category: 'dairy_yogurt',
    days_until_expiry: 0,
  }));
  assert.equal(r.action, 'eat_now');
  assert.equal(r.priority, 1);
  assert.match(r.reason, /Eat today/);
});

test('expires tomorrow, cookable chicken → use_in_recipe priority 1', () => {
  const r = computeRecommendedAction(item({
    category: 'meat_chicken',
    days_until_expiry: 1,
  }));
  assert.equal(r.action, 'use_in_recipe');
  assert.equal(r.priority, 1);
});

// ───────────────────────────────────────────────────────────
// Soon (2–3 days)
// ───────────────────────────────────────────────────────────

test('3 days left, cookable spinach → use_in_recipe priority 2', () => {
  const r = computeRecommendedAction(item({
    category: 'produce_leafy',
    days_until_expiry: 3,
  }));
  assert.equal(r.action, 'use_in_recipe');
  assert.equal(r.priority, 2);
});

test('3 days left, non-cookable yogurt → eat_soon (no freeze, since freeze_now starts at 4)', () => {
  const r = computeRecommendedAction(item({
    category: 'dairy_yogurt',
    days_until_expiry: 3,
  }));
  assert.equal(r.action, 'eat_soon');
  assert.equal(r.priority, 2);
});

// ───────────────────────────────────────────────────────────
// Freeze window (4–5 days)
// ───────────────────────────────────────────────────────────

test('4 days left, freezable bread, in fridge → freeze_now', () => {
  const r = computeRecommendedAction(item({
    category: 'bread',
    days_until_expiry: 4,
    freezable: true,
  }));
  assert.equal(r.action, 'freeze_now');
  assert.equal(r.priority, 2);
  assert.match(r.reason, /Freezable/);
});

test('5 days left, non-freezable canned good → eat_soon (4–7 catch-all)', () => {
  const r = computeRecommendedAction(item({
    category: 'pantry_canned',
    days_until_expiry: 5,
    freezable: false,
  }));
  assert.equal(r.action, 'eat_soon');
});

// ───────────────────────────────────────────────────────────
// Far future
// ───────────────────────────────────────────────────────────

test('7 days left → eat_soon', () => {
  const r = computeRecommendedAction(item({ days_until_expiry: 7 }));
  assert.equal(r.action, 'eat_soon');
});

test('8 days left → safe', () => {
  const r = computeRecommendedAction(item({ days_until_expiry: 8 }));
  assert.equal(r.action, 'safe');
  assert.equal(r.priority, 5);
});

// ───────────────────────────────────────────────────────────
// Defensive
// ───────────────────────────────────────────────────────────

test('null item returns null', () => {
  assert.equal(computeRecommendedAction(null), null);
});

test('item without days_until_expiry returns null', () => {
  assert.equal(computeRecommendedAction({ location: 'fridge' }), null);
});

test('soft cheese 4 days → eat_soon (heuristic blocks freeze)', () => {
  // dairy_cheese_soft is in NOT_FREEZABLE_CATEGORIES — even with no
  // explicit freezable=false, the engine should not recommend freezing it.
  const r = computeRecommendedAction(item({
    category: 'dairy_cheese_soft',
    days_until_expiry: 4,
  }));
  assert.equal(r.action, 'eat_soon');
});

// ───────────────────────────────────────────────────────────
// Fridge temperature multiplier (Step 6)
// ───────────────────────────────────────────────────────────

test('multiplier table — bands match the spec', () => {
  assert.equal(fridgeTempMultiplier(33), 1.15);  // ≤35
  assert.equal(fridgeTempMultiplier(35), 1.15);
  assert.equal(fridgeTempMultiplier(36), 1.0);   // 36–38
  assert.equal(fridgeTempMultiplier(38), 1.0);
  assert.equal(fridgeTempMultiplier(39), 0.85);  // 39–40
  assert.equal(fridgeTempMultiplier(40), 0.85);
  assert.equal(fridgeTempMultiplier(41), 0.7);   // ≥41
  assert.equal(fridgeTempMultiplier(45), 0.7);
});

test('effectiveDays — only fridge items are adjusted', () => {
  // Pantry items ignore fridge temp.
  assert.equal(effectiveDays(item({ location: 'pantry', days_until_expiry: 5 }), { fridge_temp_setting: 41 }), 5);
  // Counter and freezer also ignored.
  assert.equal(effectiveDays(item({ location: 'counter', days_until_expiry: 5 }), { fridge_temp_setting: 41 }), 5);
  assert.equal(effectiveDays(item({ location: 'freezer', days_until_expiry: 5 }), { fridge_temp_setting: 41 }), 5);
  // Fridge IS adjusted.
  assert.equal(effectiveDays(item({ location: 'fridge', days_until_expiry: 5 }), { fridge_temp_setting: 41 }), 3); // floor(5 * 0.7) = 3
});

test('effectiveDays — past-expiry items are not adjusted', () => {
  // Cold fridge can't un-expire something.
  assert.equal(effectiveDays(item({ location: 'fridge', days_until_expiry: -2 }), { fridge_temp_setting: 33 }), -2);
});

test('warm fridge (41°F) shrinks 5-day eat_soon-window into eat_soon urgency', () => {
  // 5 days × 0.7 = 3.5 → floor = 3 → eat_soon (was at the freeze_now boundary in a normal fridge)
  const r = computeRecommendedAction(
    item({ category: 'dairy_yogurt', days_until_expiry: 5 }),
    { fridge_temp_setting: 41 }
  );
  assert.equal(r.action, 'eat_soon');
});

test('cold fridge (34°F) keeps 8-day item safe (no extra urgency)', () => {
  // 8 days × 1.15 = 9.2 → floor = 9 → safe
  const r = computeRecommendedAction(
    item({ category: 'dairy_yogurt', days_until_expiry: 8 }),
    { fridge_temp_setting: 34 }
  );
  assert.equal(r.action, 'safe');
});

test('warm fridge bumps a 4-day freezable bread from freeze_now to eat_now', () => {
  // 4 × 0.7 = 2.8 → floor = 2 → eat_soon (cookable bread → use_in_recipe at priority 2)
  const r = computeRecommendedAction(
    item({ category: 'bread', days_until_expiry: 4, freezable: true }),
    { fridge_temp_setting: 42 }
  );
  // bread is cookable → use_in_recipe at priority 2 (the ≤3 day rule fires)
  assert.equal(r.action, 'use_in_recipe');
  assert.equal(r.priority, 2);
});
