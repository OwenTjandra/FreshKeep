import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeRecommendedAction } from '../expirationIntelligence.js';

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
