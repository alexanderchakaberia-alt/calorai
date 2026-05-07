-- Run this in your Supabase SQL editor to set up the schema
-- user_id / users.id are TEXT for Clerk user ids (e.g. user_xxxx)

create table if not exists users (
  id text primary key,
  email text,
  created_at timestamp default now()
);

create table if not exists daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  calorie_goal numeric not null default 2000,
  protein_goal numeric not null default 150,
  fat_goal numeric not null default 65,
  carbs_goal numeric not null default 250,
  fiber_goal numeric not null default 30,
  unique(user_id)
);

create table if not exists meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  food_name text not null,
  portion text,
  calories numeric not null default 0,
  protein numeric not null default 0,
  fat numeric not null default 0,
  carbs numeric not null default 0,
  fiber numeric not null default 0,
  ai_food_name text,
  ai_calories numeric,
  ai_protein numeric,
  ai_fat numeric,
  ai_carbs numeric,
  ai_confidence numeric,
  logged_at timestamp default now()
);

-- Indexes for fast per-user, per-day queries
create index if not exists idx_meal_logs_user_logged_at on meal_logs(user_id, logged_at);
create index if not exists idx_daily_goals_user_id on daily_goals(user_id);

-- Food Library
create table if not exists past_foods (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  food_name text not null,
  food_key text not null,
  portion text,
  calories numeric not null default 0,
  protein numeric not null default 0,
  fat numeric not null default 0,
  carbs numeric not null default 0,
  fiber numeric not null default 0,
  last_used_at timestamptz not null default now(),
  use_count integer not null default 1,
  favorited boolean not null default false,
  unique (user_id, food_key)
);

create index if not exists idx_past_foods_user_last on past_foods (user_id, last_used_at desc);
create index if not exists idx_past_foods_user_favorite on past_foods (user_id, favorited, last_used_at desc);

-- Demo row (optional); real users use Clerk ids from the app
insert into users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'demo@calorai.app')
on conflict (id) do nothing;
