-- Step 6: track whether the user has completed onboarding (set their fridge temp).
-- NULL = not onboarded yet → frontend shows the Onboarding screen on launch.

ALTER TABLE users
  ADD COLUMN onboarded_at TIMESTAMPTZ;
