-- ============================================================
-- Flippe · Supabase Schema (Safe Setup for Existing Database)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Step 1: Drop only Flippe-related tables (safe for existing projects)
drop table if exists public.positions cascade;
drop table if exists public.markets cascade;
drop table if exists public.profiles cascade;

-- Step 2: Drop only Flippe-related triggers and functions
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

-- Step 3: Create Profiles table
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  balance     numeric default 0,
  created_at  timestamptz default now()
);

-- Step 4: Create Markets table (id is TEXT, not UUID)
create table public.markets (
  id           text primary key,
  question     text not null,
  category     text not null,
  yes_percent  integer not null default 50,
  pool         numeric not null default 0,
  closes_in    text,
  closes_at    timestamptz,
  description  text,
  source       text,
  icon         text,
  resolved     boolean default false,
  outcome      text,
  created_at   timestamptz default now()
);

-- Step 5: Create Positions table (market_id is TEXT to match markets.id)
create table public.positions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  market_id   text references public.markets(id) on delete cascade,
  side        text not null check (side in ('YES', 'NO')),
  stake       numeric not null,
  payout      numeric,
  outcome     text,
  created_at  timestamptz default now()
);

-- Step 6: Enable Row Level Security
alter table public.profiles  enable row level security;
alter table public.markets   enable row level security;
alter table public.positions enable row level security;

-- Step 7: Create RLS Policies for Profiles
create policy "profiles: own read"   
  on public.profiles for select 
  using (auth.uid() = id);

create policy "profiles: own update" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "profiles: own insert" 
  on public.profiles for insert 
  with check (auth.uid() = id);

-- Step 8: Create RLS Policies for Markets
create policy "markets: public read" 
  on public.markets for select 
  using (true);

-- Step 9: Create RLS Policies for Positions
create policy "positions: own read"   
  on public.positions for select 
  using (auth.uid() = user_id);

create policy "positions: own insert" 
  on public.positions for insert 
  with check (auth.uid() = user_id);

-- Step 10: Create function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger 
language plpgsql 
security definer 
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, balance)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Step 11: Create trigger for auto-profile creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row 
  execute function public.handle_new_user();

-- Step 12: Seed markets: REMOVED
-- All markets must be created through the admin dashboard
