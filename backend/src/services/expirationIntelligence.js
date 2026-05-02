// Expiration intelligence engine.
//
// STUB. The full rule engine arrives in Step 5 — until then, this returns
// null so callers don't break. Step 5 will:
//
//   - Implement rules for: eat_now, eat_soon, freeze_now, use_in_recipe,
//     compost, monitor, safe.
//   - Cover edge cases: opened items use opened-shelf-life, frozen items
//     get long shelf life, "looks fine" 24-hour grace period for past-date.
//   - Apply the fridge-temp multiplier from the user record (Step 6).
//   - Be unit-tested across at least 8 scenarios.
//
// Signature is set now so routes/services can call it; only the body changes.

/**
 * @param {object} item        - row from items, plus days_until_expiry
 * @param {object} [user]      - row from users (uses fridge_temp_setting)
 * @returns {{ action: string, priority: number, reason: string } | null}
 */
// eslint-disable-next-line no-unused-vars
export function computeRecommendedAction(item, user) {
  return null;
}
