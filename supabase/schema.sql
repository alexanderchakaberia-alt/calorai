-- Run this in your Supabase SQL editor to set up the schema

create table if not exists users (
  id uuid primary key,
  email text,
  created_at timestamp default now()
);

create table if not exists daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  calorie_goal numeric not null default 2000,
  protein_goal numeric not null default 150,
  fat_goal numeric not null default 65,
  carbs_goal numeric not null default 225,
  unique(user_id)
);

create table if not exists meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  food_name text not null,
  portion text,
  calories numeric not null default 0,
  protein numeric not null default 0,
  fat numeric not null default 0,
  carbs numeric not null default 0,
  logged_at timestamp default now()
);

-- Indexes for fast per-user, per-day queries
create index if not exists idx_meal_logs_user_logged_at on meal_logs(user_id, logged_at);
create index if not exists idx_daily_goals_user_id on daily_goals(user_id);

-- Insert the demo user so FK constraints don't fail before auth is added
insert into users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'demo@calorai.app')
on conflict (id) do nothing;
