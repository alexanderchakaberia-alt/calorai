-- Food Library: per-user remembered foods (run in Supabase SQL editor if not using CLI migrations)
-- user_id matches Clerk user ids (text)

CREATE TABLE IF NOT EXISTS past_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  food_name TEXT NOT NULL,
  food_key TEXT NOT NULL,
  portion TEXT,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  use_count INTEGER NOT NULL DEFAULT 1,
  favorited BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT past_foods_user_food_unique UNIQUE (user_id, food_key)
);

CREATE INDEX IF NOT EXISTS idx_past_foods_user_last ON past_foods (user_id, last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_past_foods_user_favorite ON past_foods (user_id, favorited, last_used_at DESC);

COMMENT ON TABLE past_foods IS 'Remembered foods per user; food_key = lower(trim(food_name)) for deduping.';
