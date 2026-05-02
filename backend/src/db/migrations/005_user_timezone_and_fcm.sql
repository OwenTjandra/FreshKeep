-- Step 14: notifications support.
-- - users.timezone:     IANA tz string for "9am local time" cron logic
-- - users.last_notified_at: tracked so we send at most one push per day
-- - fcm_tokens:         per-device tokens; one user can have many devices

ALTER TABLE users
  ADD COLUMN timezone         TEXT NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN last_notified_at TIMESTAMPTZ;

CREATE TABLE fcm_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL,
  device_label  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX fcm_tokens_user_idx ON fcm_tokens(user_id);
