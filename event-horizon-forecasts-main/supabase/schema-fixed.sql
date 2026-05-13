-- ============================================================
-- Flippe · Supabase Schema (Fixed)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Drop existing tables if they exist (to start fresh)
drop table if exists public.positions cascade;
drop table if exists public.markets cascade;
drop table if exists public.profiles cascade;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Profiles (extends auth.users)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  balance     numeric default 10000,
  created_at  timestamptz default now()
);

-- Markets
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

-- Positions (user bets) - market_id is text to match markets.id
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

-- Row Level Security
alter table public.profiles  enable row level security;
alter table public.markets   enable row level security;
alter table public.positions enable row level security;

create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);
create policy "profiles: own insert" on public.profiles for insert with check (auth.uid() = id);

create policy "markets: public read" on public.markets for select using (true);

create policy "positions: own read"   on public.positions for select using (auth.uid() = user_id);
create policy "positions: own insert" on public.positions for insert with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, balance)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    10000
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed markets
insert into public.markets (id, question, category, yes_percent, pool, closes_in, description, source, icon) values
  ('btc-100k',       'Will Bitcoin close above $100,000 by end of May 2026?',  'Finance',       64, 1240000, '5h 20m',  'Resolves YES if BTC/USD on Coinbase closes above $100,000 on May 31, 2026 (UTC).', 'Coinbase BTC/USD daily close',    '₿'),
  ('election-adc',   'Will ADC win the 2027 Presidential Election?',            'Politics',      38,  845000, '2d 11h',  'Resolves YES if the ADC candidate is officially declared winner by INEC.',          'INEC official announcement',      '🏛'),
  ('arsenal-trophy', 'Will Arsenal finish the season trophyless?',              'Trending',      54,  412000, '12d 4h',  'Resolves YES if Arsenal does not win PL, FA Cup, EFL Cup, or UCL.',                'Official league/cup results',     '⚽'),
  ('asake-streams',  'Will Asake''s new album hit 7M+ second-day streams?',     'Entertainment', 36,  137000, '1d 6h',   'Resolves YES if global second-day streams exceed 7,000,000.',                      'Spotify + Apple Music public data','🎵'),
  ('cbn-rates',      'Will CBN maintain interest rates this MPC?',              'Economy',       51,  522000, '3d 22h',  'Resolves YES if the MPR is unchanged after the next MPC meeting.',                 'CBN official communiqué',         '🏦'),
  ('ai-launch',      'Will OpenAI release GPT-6 before August 2026?',           'Technology',    22,  298000, '30d+',    'Resolves YES upon official public release of a model branded GPT-6.',              'OpenAI official announcement',    '🤖')
on conflict (id) do nothing;
