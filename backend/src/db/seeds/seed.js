import 'dotenv/config';
import pg from 'pg';

// 10 sample items spanning categories, locations, opened states, and proximity to expiry —
// designed so the Step 5 rule engine has cases to test against:
//   - past expiry           (expires_in_days: -1)
//   - eat-now / eat-soon    (0 to 3 days)
//   - freeze candidate      (3-5 days, freezable, not yet frozen)
//   - already frozen        (location: 'freezer', long shelf life)
//   - opened-clock starts   (opened: true, opened_days_ago)
//   - safe / shelf-stable   (>7 days)
const SAMPLE_ITEMS = [
  { name: 'Whole milk',        category: 'dairy_milk',          location: 'fridge',  opened: true,  opened_days_ago: 2, expires_in_days: 3,  quantity: 1 },
  { name: 'Greek yogurt',      category: 'dairy_yogurt',        location: 'fridge',  opened: false,                    expires_in_days: 8,  quantity: 2 },
  { name: 'Chicken breast',    category: 'meat_chicken',        location: 'fridge',  opened: false,                    expires_in_days: 1,  quantity: 1 },
  { name: 'Spinach',           category: 'produce_leafy',       location: 'fridge',  opened: true,  opened_days_ago: 1, expires_in_days: 2,  quantity: 1 },
  { name: 'Strawberries',      category: 'produce_berries',     location: 'fridge',  opened: false,                    expires_in_days: 0,  quantity: 1 },
  { name: 'Eggs (dozen)',      category: 'eggs',                location: 'fridge',  opened: false,                    expires_in_days: 21, quantity: 1 },
  { name: 'Sourdough loaf',    category: 'bread',               location: 'counter', opened: true,  opened_days_ago: 4, expires_in_days: -1, quantity: 1 },
  { name: 'Ground beef',       category: 'meat_beef',           location: 'freezer', opened: false,                    expires_in_days: 90, quantity: 1 },
  { name: 'Apples',            category: 'produce_hard_fruit',  location: 'fridge',  opened: false,                    expires_in_days: 14, quantity: 5 },
  { name: 'Cheddar cheese',    category: 'dairy_cheese_hard',   location: 'fridge',  opened: true,  opened_days_ago: 5, expires_in_days: 25, quantity: 1 },
];

const DEMO_EMAIL = 'demo@freshkeep.app';

function daysFromNow(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function hoursAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(`
      INSERT INTO users (email, fridge_temp_setting)
      VALUES ($1, 37)
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `, [DEMO_EMAIL]);
    const userId = userResult.rows[0].id;

    // Wipe and re-seed items for the demo user so the seed is idempotent.
    await client.query('DELETE FROM items WHERE user_id = $1', [userId]);

    for (const it of SAMPLE_ITEMS) {
      const openedAt = it.opened ? hoursAgo(it.opened_days_ago) : null;
      await client.query(`
        INSERT INTO items
          (user_id, name, category, quantity, location, opened, opened_at, expiry_date)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        userId,
        it.name,
        it.category,
        it.quantity,
        it.location,
        it.opened,
        openedAt,
        daysFromNow(it.expires_in_days),
      ]);
    }

    await client.query('COMMIT');
    console.log(`✓ Seeded user ${DEMO_EMAIL} with ${SAMPLE_ITEMS.length} items.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
