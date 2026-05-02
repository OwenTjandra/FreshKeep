-- Seed: shelf_life_reference
-- ---------------------------------------------------------------
-- Source: USDA FSIS FoodKeeper (foodsafety.gov / foodkeeper app).
-- These values are starting estimates derived from USDA FoodKeeper
-- guidance. They intentionally err on the conservative side (shorter
-- shelf life). Tune them based on real usage data — Step 20 introduces
-- a per-user Bayesian adjuster that learns from actual spoilage marks.
--
-- Schema reminder: UNIQUE (category, location, opened).
-- Days are *from purchase or last state change* (e.g., from "opened"
-- date if opened=true, else from purchase / packaging date).
--
-- "freezable" reflects whether freezing is recommended for *quality*,
-- not just safety. Soft cheeses are technically freezable but quality
-- degrades severely, so we mark them not-freezable.
-- ---------------------------------------------------------------

INSERT INTO shelf_life_reference
  (category, location, opened, days_min, days_typical, days_max, freezable, source, notes)
VALUES

-- ════════════════════════ DAIRY ════════════════════════

-- Milk (whole, 2%, skim — same range)
('dairy_milk',         'fridge',  FALSE,   4,   7,  10, TRUE,  'USDA FSIS FoodKeeper', 'Unopened: ~1 week past sell-by date.'),
('dairy_milk',         'fridge',  TRUE,    4,   7,  10, TRUE,  'USDA FSIS FoodKeeper', 'Opened: clock starts at open; ~1 week.'),
('dairy_milk',         'freezer', FALSE,  60,  90, 120, TRUE,  'USDA FSIS FoodKeeper', 'Texture may separate; whisk after thaw.'),
('dairy_milk',         'freezer', TRUE,   60,  90, 120, TRUE,  'USDA FSIS FoodKeeper', 'Texture may separate; whisk after thaw.'),

-- Yogurt
('dairy_yogurt',       'fridge',  FALSE,  10,  14,  21, TRUE,  'USDA FSIS FoodKeeper', '1–2 weeks past sell-by unopened.'),
('dairy_yogurt',       'fridge',  TRUE,    5,   7,  10, TRUE,  'USDA FSIS FoodKeeper', 'Once opened, ~1 week.'),
('dairy_yogurt',       'freezer', FALSE,  30,  60,  60, TRUE,  'USDA FSIS FoodKeeper', 'Texture changes; best for smoothies after thaw.'),
('dairy_yogurt',       'freezer', TRUE,   30,  60,  60, TRUE,  'USDA FSIS FoodKeeper', 'Texture changes; best for smoothies after thaw.'),

-- Hard cheese (cheddar, parmesan, gouda, swiss)
('dairy_cheese_hard',  'fridge',  FALSE,  90, 180, 240, TRUE,  'USDA FSIS FoodKeeper', '6+ months unopened.'),
('dairy_cheese_hard',  'fridge',  TRUE,   21,  28,  42, TRUE,  'USDA FSIS FoodKeeper', '3–6 weeks once opened.'),
('dairy_cheese_hard',  'freezer', FALSE, 180, 180, 240, TRUE,  'USDA FSIS FoodKeeper', 'Crumbly after thaw — best for cooking.'),
('dairy_cheese_hard',  'freezer', TRUE,  180, 180, 240, TRUE,  'USDA FSIS FoodKeeper', 'Crumbly after thaw — best for cooking.'),

-- Soft cheese (brie, ricotta, cottage cheese, fresh mozzarella)
-- Freezing not recommended — quality drops severely.
('dairy_cheese_soft',  'fridge',  FALSE,   7,  14,  21, FALSE, 'USDA FSIS FoodKeeper', '1–2 weeks unopened.'),
('dairy_cheese_soft',  'fridge',  TRUE,    3,   7,  10, FALSE, 'USDA FSIS FoodKeeper', '~1 week once opened.'),

-- Butter (salted)
('dairy_butter',       'fridge',  FALSE,  60,  90, 120, TRUE,  'USDA FSIS FoodKeeper', '2–3 months unopened in fridge.'),
('dairy_butter',       'fridge',  TRUE,   30,  30,  60, TRUE,  'USDA FSIS FoodKeeper', '~1 month once opened.'),
('dairy_butter',       'freezer', FALSE, 180, 270, 365, TRUE,  'USDA FSIS FoodKeeper', '6–12 months frozen.'),
('dairy_butter',       'freezer', TRUE,  180, 270, 365, TRUE,  'USDA FSIS FoodKeeper', '6–12 months frozen.'),

-- ════════════════════════ MEAT ════════════════════════

-- Raw chicken (whole, parts)
('meat_chicken',       'fridge',  FALSE,   1,   2,   3, TRUE,  'USDA FSIS FoodKeeper', 'Raw poultry: 1–2 days in fridge.'),
('meat_chicken',       'fridge',  TRUE,    1,   2,   3, TRUE,  'USDA FSIS FoodKeeper', 'Same once out of original packaging.'),
('meat_chicken',       'freezer', FALSE, 270, 270, 365, TRUE,  'USDA FSIS FoodKeeper', '9–12 months frozen.'),
('meat_chicken',       'freezer', TRUE,  270, 270, 365, TRUE,  'USDA FSIS FoodKeeper', '9–12 months frozen.'),

-- Raw beef (cuts: steaks, roasts)
('meat_beef',          'fridge',  FALSE,   3,   4,   5, TRUE,  'USDA FSIS FoodKeeper', 'Whole cuts: 3–5 days in fridge.'),
('meat_beef',          'fridge',  TRUE,    2,   3,   4, TRUE,  'USDA FSIS FoodKeeper', 'Slightly less once unwrapped.'),
('meat_beef',          'freezer', FALSE, 180, 270, 365, TRUE,  'USDA FSIS FoodKeeper', '6–12 months frozen (whole cuts).'),
('meat_beef',          'freezer', TRUE,  180, 270, 365, TRUE,  'USDA FSIS FoodKeeper', '6–12 months frozen (whole cuts).'),

-- Ground beef (separate row — much shorter shelf life than cuts)
('meat_beef_ground',   'fridge',  FALSE,   1,   2,   2, TRUE,  'USDA FSIS FoodKeeper', 'Ground meats: 1–2 days in fridge.'),
('meat_beef_ground',   'fridge',  TRUE,    1,   2,   2, TRUE,  'USDA FSIS FoodKeeper', 'Same once unwrapped.'),
('meat_beef_ground',   'freezer', FALSE,  90, 120, 120, TRUE,  'USDA FSIS FoodKeeper', '3–4 months frozen.'),
('meat_beef_ground',   'freezer', TRUE,   90, 120, 120, TRUE,  'USDA FSIS FoodKeeper', '3–4 months frozen.'),

-- Raw pork (cuts)
('meat_pork',          'fridge',  FALSE,   3,   4,   5, TRUE,  'USDA FSIS FoodKeeper', 'Whole cuts: 3–5 days in fridge.'),
('meat_pork',          'fridge',  TRUE,    2,   3,   4, TRUE,  'USDA FSIS FoodKeeper', 'Slightly less once unwrapped.'),
('meat_pork',          'freezer', FALSE, 120, 180, 180, TRUE,  'USDA FSIS FoodKeeper', '4–6 months frozen.'),
('meat_pork',          'freezer', TRUE,  120, 180, 180, TRUE,  'USDA FSIS FoodKeeper', '4–6 months frozen.'),

-- Raw fish (lean fish: cod, tilapia; fatty fish: salmon — averaged here)
('meat_fish',          'fridge',  FALSE,   1,   2,   2, TRUE,  'USDA FSIS FoodKeeper', 'Raw fish: 1–2 days in fridge.'),
('meat_fish',          'fridge',  TRUE,    1,   1,   2, TRUE,  'USDA FSIS FoodKeeper', 'Use ASAP once unwrapped.'),
('meat_fish',          'freezer', FALSE,  90, 180, 240, TRUE,  'USDA FSIS FoodKeeper', 'Lean fish: 6–8 months. Fatty fish: 2–3 months.'),
('meat_fish',          'freezer', TRUE,   90, 180, 240, TRUE,  'USDA FSIS FoodKeeper', 'Lean fish: 6–8 months. Fatty fish: 2–3 months.'),

-- ════════════════════════ PRODUCE ════════════════════════

-- Leafy greens (spinach, lettuce, kale, arugula)
('produce_leafy',      'fridge',  FALSE,   5,   7,  10, TRUE,  'USDA FSIS FoodKeeper', '5–10 days unopened in crisper.'),
('produce_leafy',      'fridge',  TRUE,    3,   5,   7, TRUE,  'USDA FSIS FoodKeeper', '3–7 days once opened/washed.'),
('produce_leafy',      'freezer', FALSE, 240, 270, 365, TRUE,  'USDA FSIS FoodKeeper', 'Best blanched first; use cooked after thaw.'),
('produce_leafy',      'freezer', TRUE,  240, 270, 365, TRUE,  'USDA FSIS FoodKeeper', 'Best blanched first; use cooked after thaw.'),

-- Hard vegetables (carrots, broccoli, celery, cabbage)
('produce_hard_veg',   'fridge',  FALSE,  14,  21,  28, TRUE,  'USDA FSIS FoodKeeper', 'Range varies widely — carrots ~1 month, broccoli ~5 days.'),
('produce_hard_veg',   'fridge',  TRUE,    7,  14,  14, TRUE,  'USDA FSIS FoodKeeper', '1–2 weeks once cut/cleaned.'),
('produce_hard_veg',   'freezer', FALSE, 240, 270, 365, TRUE,  'USDA FSIS FoodKeeper', 'Blanch before freezing for best texture.'),
('produce_hard_veg',   'freezer', TRUE,  240, 270, 365, TRUE,  'USDA FSIS FoodKeeper', 'Blanch before freezing for best texture.'),

-- Soft fruit (peaches, plums, tomatoes, avocados, mangoes)
('produce_soft_fruit', 'counter', FALSE,   1,   3,   5, TRUE,  'USDA FSIS FoodKeeper', 'Counter for ripening; move to fridge once ripe.'),
('produce_soft_fruit', 'fridge',  FALSE,   3,   5,   7, TRUE,  'USDA FSIS FoodKeeper', '3–7 days in fridge once ripe.'),
('produce_soft_fruit', 'fridge',  TRUE,    2,   3,   5, TRUE,  'USDA FSIS FoodKeeper', '2–5 days once cut.'),
('produce_soft_fruit', 'freezer', FALSE, 180, 240, 365, TRUE,  'USDA FSIS FoodKeeper', 'Best sliced and pre-frozen on a tray.'),
('produce_soft_fruit', 'freezer', TRUE,  180, 240, 365, TRUE,  'USDA FSIS FoodKeeper', 'Best sliced and pre-frozen on a tray.'),

-- Hard fruit (apples, pears)
('produce_hard_fruit', 'counter', FALSE,   7,  14,  21, TRUE,  'USDA FSIS FoodKeeper', '1–3 weeks at room temp.'),
('produce_hard_fruit', 'fridge',  FALSE,  21,  30,  42, TRUE,  'USDA FSIS FoodKeeper', '3–6 weeks in fridge crisper.'),
('produce_hard_fruit', 'fridge',  TRUE,    3,   5,   7, TRUE,  'USDA FSIS FoodKeeper', '3–7 days once cut (browns fast).'),
('produce_hard_fruit', 'freezer', FALSE, 240, 270, 365, TRUE,  'USDA FSIS FoodKeeper', 'Sliced; tossed in lemon juice prevents browning.'),
('produce_hard_fruit', 'freezer', TRUE,  240, 270, 365, TRUE,  'USDA FSIS FoodKeeper', 'Sliced; tossed in lemon juice prevents browning.'),

-- Berries (strawberries, blueberries, raspberries, blackberries)
('produce_berries',    'fridge',  FALSE,   3,   5,   7, TRUE,  'USDA FSIS FoodKeeper', '3–7 days; do not wash until use.'),
('produce_berries',    'fridge',  TRUE,    2,   3,   5, TRUE,  'USDA FSIS FoodKeeper', '2–5 days once washed.'),
('produce_berries',    'freezer', FALSE, 180, 270, 365, TRUE,  'USDA FSIS FoodKeeper', 'Pre-freeze on a tray to avoid clumping.'),
('produce_berries',    'freezer', TRUE,  180, 270, 365, TRUE,  'USDA FSIS FoodKeeper', 'Pre-freeze on a tray to avoid clumping.'),

-- ════════════════════════ EGGS ════════════════════════

-- Eggs in shell — fridge only in US.
('eggs',               'fridge',  FALSE,  21,  28,  35, TRUE,  'USDA FSIS FoodKeeper', '3–5 weeks past sell-by; freeze beaten only.'),
('eggs',               'fridge',  TRUE,    2,   2,   4, TRUE,  'USDA FSIS FoodKeeper', 'Beaten/cracked: 2–4 days in fridge.'),
('eggs',               'freezer', TRUE,  365, 365, 365, TRUE,  'USDA FSIS FoodKeeper', 'Beaten only — never freeze in shell.'),

-- ════════════════════════ BREAD ════════════════════════

('bread',              'counter', FALSE,   5,   7,  14, TRUE,  'USDA FSIS FoodKeeper', '5–14 days at room temp; mold risk in humidity.'),
('bread',              'counter', TRUE,    5,   7,  14, TRUE,  'USDA FSIS FoodKeeper', 'Same once opened if kept sealed.'),
('bread',              'fridge',  FALSE,   7,  14,  21, TRUE,  'USDA FSIS FoodKeeper', 'Slows mold but stales faster — texture suffers.'),
('bread',              'fridge',  TRUE,    7,  14,  21, TRUE,  'USDA FSIS FoodKeeper', 'Slows mold but stales faster — texture suffers.'),
('bread',              'freezer', FALSE,  60,  60,  90, TRUE,  'USDA FSIS FoodKeeper', '2–3 months; toast straight from freezer.'),
('bread',              'freezer', TRUE,   60,  60,  90, TRUE,  'USDA FSIS FoodKeeper', '2–3 months; toast straight from freezer.'),

-- ════════════════════════ DELI ════════════════════════

-- Lunch meat / sliced deli
('deli',               'fridge',  FALSE,  14,  14,  21, TRUE,  'USDA FSIS FoodKeeper', '2–3 weeks unopened.'),
('deli',               'fridge',  TRUE,    3,   4,   5, TRUE,  'USDA FSIS FoodKeeper', '3–5 days once opened.'),
('deli',               'freezer', FALSE,  30,  60,  60, TRUE,  'USDA FSIS FoodKeeper', '1–2 months frozen; texture changes slightly.'),
('deli',               'freezer', TRUE,   30,  60,  60, TRUE,  'USDA FSIS FoodKeeper', '1–2 months frozen; texture changes slightly.'),

-- ════════════════════════ PANTRY ════════════════════════

-- Dry goods (rice, pasta, flour, sugar)
('pantry_dry_goods',   'pantry',  FALSE, 365, 540, 730, FALSE, 'USDA FSIS FoodKeeper', '1–2+ years sealed; freezable extends but rarely needed.'),
('pantry_dry_goods',   'pantry',  TRUE,  180, 365, 365, FALSE, 'USDA FSIS FoodKeeper', '6–12 months once opened (airtight container).'),

-- Canned goods (low-acid: vegetables, soups; high-acid lasts shorter once opened)
('pantry_canned',      'pantry',  FALSE, 365, 730,1095, FALSE, 'USDA FSIS FoodKeeper', '2–5 years sealed; check for bulging cans.'),
('pantry_canned',      'fridge',  TRUE,    3,   5,   7, FALSE, 'USDA FSIS FoodKeeper', 'Once opened: transfer to container, fridge 3–7 days.');
