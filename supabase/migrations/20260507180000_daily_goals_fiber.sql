-- Daily fiber target for goals calculator / manual entry
ALTER TABLE daily_goals
  ADD COLUMN IF NOT EXISTS fiber_goal NUMERIC NOT NULL DEFAULT 30;

COMMENT ON COLUMN daily_goals.fiber_goal IS 'Daily fiber target (grams)';
