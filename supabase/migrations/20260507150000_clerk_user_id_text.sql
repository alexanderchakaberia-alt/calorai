-- Clerk user ids are strings (e.g. user_xxx), not UUIDs.
-- Run in Supabase SQL Editor (or via CLI). Safe to re-run if constraints differ.

-- 1) Drop FKs from child tables -> users
ALTER TABLE daily_goals DROP CONSTRAINT IF EXISTS daily_goals_user_id_fkey;
ALTER TABLE meal_logs DROP CONSTRAINT IF EXISTS meal_logs_user_id_fkey;

-- 2) users primary key: uuid -> text (stores Clerk user IDs)
ALTER TABLE users ALTER COLUMN id TYPE text USING id::text;

-- 3) Goal + meal rows reference users as text
ALTER TABLE daily_goals ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE meal_logs ALTER COLUMN user_id TYPE text USING user_id::text;

-- 4) Restore referential integrity
ALTER TABLE daily_goals
  ADD CONSTRAINT daily_goals_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE meal_logs
  ADD CONSTRAINT meal_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

-- Optional: if you created legacy tables named `meals` / `goals` with uuid user_id:
-- ALTER TABLE meals ALTER COLUMN user_id TYPE text USING user_id::text;
-- ALTER TABLE goals ALTER COLUMN user_id TYPE text USING user_id::text;
