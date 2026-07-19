-- ============================================================
-- Flippe · Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  balance     numeric default 0,
  created_at  timestamptz default now()
);

-- Markets
create table if not exists public.markets (
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
  outcome      text, -- 'YES' | 'NO' | null
  created_at   timestamptz default now()
);

-- Positions (user bets)
create table if not exists public.positions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  market_id   text references public.markets(id) on delete cascade,
  side        text not null check (side in ('YES', 'NO')),
  stake       numeric not null,
  payout      numeric,
  outcome     text, -- 'WON' | 'LOST' | null (null = unresolved)
  created_at  timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles  enable row level security;
alter table public.markets   enable row level security;
alter table public.positions enable row level security;

-- Profiles: users can read/update their own
create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);
create policy "profiles: own insert" on public.profiles for insert with check (auth.uid() = id);

-- Markets: anyone can read
create policy "markets: public read" on public.markets for select using (true);

-- Positions: users manage their own
create policy "positions: own read"   on public.positions for select using (auth.uid() = user_id);
create policy "positions: own insert" on public.positions for insert with check (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Seed markets: REMOVED
-- All markets must be created through the admin dashboard
-- ============================================================
