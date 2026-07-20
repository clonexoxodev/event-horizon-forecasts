-- ============================================================
-- Flippe · Complete Supabase Schema Reference
-- Generated: 2026-07-20
-- This file is for reference only. Run the migration files
-- in supabase/migrations/ to set up the database.
-- ============================================================

-- ============================================================
-- 1. USERS (extends auth.users)
-- ============================================================
create table if not exists public.users (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text unique not null,
  email               text not null,
  name                text,
  password_hash       text not null,
  role                text not null default 'user' check (role in ('user', 'admin', 'super_admin')),
  avatar_url          text,
  profile_image_url   text,
  account_status      text default 'active' check (account_status in ('active', 'suspended', 'closed')),
  suspended_at        timestamptz,
  suspended_by        uuid references auth.users(id),
  suspension_reason   text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ============================================================
-- 2. WALLETS
-- ============================================================
create table if not exists public.wallets (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null unique references auth.users(id) on delete cascade,
  balance_ngn_kobo            bigint not null default 0,
  balance_usd_cents           bigint not null default 0,
  available_ngn_kobo          bigint not null default 0,
  available_usd_cents         bigint not null default 0,
  locked_ngn_kobo             bigint not null default 0,
  locked_usd_cents            bigint not null default 0,
  total_deposited_ngn_kobo    bigint not null default 0,
  total_withdrawn_ngn_kobo    bigint not null default 0,
  total_winnings_ngn_kobo     bigint not null default 0,
  total_staked_ngn_kobo       bigint not null default 0,
  currency                    text not null default 'NGN',
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

-- ============================================================
-- 3. MARKETS
-- ============================================================
create table if not exists public.markets (
  id                                  text primary key,
  question                            text not null,
  description                         text,
  category                            text not null,
  country_filter                      text,
  market_type                         text not null default 'binary',
  status                              text not null default 'active',
  state                               text not null default 'trading',
  currency                            text not null default 'NGN',
  -- Labels
  yes_label                           text not null default 'YES',
  no_label                            text not null default 'NO',
  -- Pricing
  yes_price                           numeric not null default 0.5,
  no_price                            numeric not null default 0.5,
  pricing_model                       text not null default 'dynamic',
  starting_yes_price                  numeric,
  starting_no_price                   numeric,
  -- Pool & volume
  pool_amount_smallest_unit           bigint not null default 0,
  settlement_pool_smallest_unit       bigint not null default 0,
  yes_pool_smallest_unit              bigint not null default 0,
  no_pool_smallest_unit               bigint not null default 0,
  yes_volume_smallest_unit            bigint not null default 0,
  no_volume_smallest_unit             bigint not null default 0,
  total_volume_smallest_unit          bigint not null default 0,
  seed_liquidity_yes_smallest_unit    bigint not null default 0,
  seed_liquidity_no_smallest_unit     bigint not null default 0,
  -- Shares & participants
  total_yes_shares                    numeric not null default 0,
  total_no_shares                     numeric not null default 0,
  participant_count                   integer not null default 0,
  trade_count                         integer not null default 0,
  -- Dates
  close_date                          timestamptz,
  closes_at                           timestamptz,
  trading_close_at                    timestamptz,
  resolution_date                     timestamptz,
  -- Resolution
  resolution_source                   text,
  resolution_instructions             text,
  outcome                             text,
  winning_outcome                     text,
  resolved_outcome                    text,
  resolved_at                         timestamptz,
  resolved_by                         uuid,
  -- Refund
  refunded_at                         timestamptz,
  refund_reason                       text,
  refund_status                       text,
  refunded_by                         uuid,
  -- Payout
  payout_status                       text,
  payout_completed_at                 timestamptz,
  -- Activation (protected market)
  activation_state                    text not null default 'pre_activation',
  activated_at                        timestamptz,
  activated_by                        uuid,
  activation_snapshot                 jsonb,
  protected_market_enabled            boolean not null default false,
  activation_threshold_smallest_unit  bigint,
  activation_yes_min_smallest_unit    bigint,
  activation_no_min_smallest_unit     bigint,
  activation_min_participants         integer,
  protected_max_stake_smallest_unit   bigint,
  -- Media
  image_url                           text,
  video_url                           text,
  is_trending                         boolean not null default false,
  -- Position limits
  min_position_smallest_unit          bigint,
  max_position_smallest_unit          bigint,
  -- Creator
  created_by                          uuid,
  rules                               text,
  archived_at                         timestamptz,
  -- Legacy
  yes_percent                         integer not null default 50,
  pool                                numeric not null default 0,
  closes_in                           text,
  source                              text,
  icon                                text,
  resolved                            boolean default false,
  created_at                          timestamptz default now(),
  updated_at                          timestamptz default now()
);

-- ============================================================
-- 4. POSITIONS
-- ============================================================
create table if not exists public.positions (
  id                                uuid primary key default gen_random_uuid(),
  user_id                           uuid not null references auth.users(id) on delete cascade,
  market_id                         text not null references public.markets(id) on delete cascade,
  side                              text not null check (side in ('YES', 'NO')),
  amount_smallest_unit              bigint,
  stake_amount                      bigint,
  currency                          text not null default 'NGN',
  potential_return_smallest_unit    bigint,
  estimated_payout_smallest_unit    bigint,
  estimated_profit_smallest_unit    bigint,
  estimated_payout_at_purchase      bigint,
  estimated_profit_at_purchase      bigint,
  shares_received                   numeric,
  shares_owned                      numeric,
  price_at_purchase                 numeric,
  entry_price                       numeric,
  current_price                     numeric,
  current_value_smallest_unit       bigint,
  ownership_percent                 numeric,
  status                            text not null default 'open',
  is_winner                         boolean,
  payout_smallest_unit              bigint,
  final_payout_smallest_unit        bigint,
  settlement_payout_smallest_unit   bigint,
  settlement_profit_smallest_unit   bigint,
  profit_smallest_unit              bigint,
  winning_outcome                   text,
  outcome                           text,
  resolved_at                       timestamptz,
  settled_at                        timestamptz,
  market_question_snapshot          text,
  market_category_snapshot          text,
  stake                             numeric not null default 0,
  payout                            numeric,
  created_at                        timestamptz default now()
);

-- ============================================================
-- 5. TRANSACTIONS
-- ============================================================
create table if not exists public.transactions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  wallet_id               uuid,
  type                    text not null,
  amount_smallest_unit    bigint not null,
  currency                text not null default 'NGN',
  direction               text not null check (direction in ('IN', 'OUT', 'RELEASE')),
  status                  text not null default 'pending',
  reference               text,
  reference_id            text,
  reference_type          text,
  description             text,
  metadata                jsonb,
  market_id               text,
  position_id             uuid,
  approved_by             uuid,
  approved_at             timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ============================================================
-- 6. NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  type            text not null,
  title           text not null,
  message         text,
  reference_id    text,
  reference_type  text,
  metadata        jsonb,
  is_read         boolean not null default false,
  read_at         timestamptz,
  created_at      timestamptz default now()
);

-- ============================================================
-- 7. MARKET_PRICE_HISTORY
-- ============================================================
create table if not exists public.market_price_history (
  id                        uuid primary key default gen_random_uuid(),
  market_id                 text not null references public.markets(id) on delete cascade,
  yes_price                 numeric,
  no_price                  numeric,
  yes_pool_smallest_unit    bigint,
  no_pool_smallest_unit     bigint,
  volume_smallest_unit      bigint,
  trade_count               integer,
  side                      text,
  amount_smallest_unit      bigint,
  created_at                timestamptz default now()
);

-- ============================================================
-- 8. DEPOSIT_REQUESTS
-- ============================================================
create table if not exists public.deposit_requests (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  wallet_id               uuid not null,
  transaction_id          uuid not null,
  amount_smallest_unit    bigint not null,
  currency                text not null default 'NGN',
  reference               text unique not null,
  provider                text default 'flutterwave',
  payment_instruction     jsonb,
  status                  text not null default 'pending',
  metadata                jsonb,
  approved_by             uuid,
  approved_at             timestamptz,
  rejected_by             uuid,
  rejected_at             timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ============================================================
-- 9. WITHDRAWAL_REQUESTS
-- ============================================================
create table if not exists public.withdrawal_requests (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  wallet_id               uuid,
  transaction_id          uuid,
  amount_smallest_unit    bigint not null,
  currency                text not null default 'NGN',
  reference               text unique not null,
  provider                text default 'flutterwave',
  bank_name               text,
  account_number          text,
  account_name            text,
  review_tier             text default 'standard',
  status                  text not null default 'pending',
  metadata                jsonb,
  approved_by             uuid,
  approved_at             timestamptz,
  rejected_by             uuid,
  rejected_at             timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ============================================================
-- 10. MARKET_COMMENTS
-- ============================================================
create table if not exists public.market_comments (
  id          uuid primary key default gen_random_uuid(),
  market_id   text not null references public.markets(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null,
  like_count  integer default 0,
  created_at  timestamptz default now()
);

-- ============================================================
-- 11. MARKET_TRADES
-- ============================================================
create table if not exists public.market_trades (
  id                      uuid primary key default gen_random_uuid(),
  market_id               text not null references public.markets(id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  position_id             uuid references public.positions(id) on delete set null,
  side                    text not null check (side in ('YES', 'NO')),
  amount_smallest_unit    bigint not null,
  price_before            numeric,
  price_after             numeric,
  yes_price_after         numeric,
  no_price_after          numeric,
  currency                text not null default 'NGN',
  created_at              timestamptz default now()
);

-- ============================================================
-- 12. MARKET_ACTIVITY_EVENTS
-- ============================================================
create table if not exists public.market_activity_events (
  id                            uuid primary key default gen_random_uuid(),
  market_id                     text not null references public.markets(id) on delete cascade,
  user_id                       uuid references auth.users(id) on delete set null,
  position_id                   uuid references public.positions(id) on delete set null,
  event_type                    text not null,
  side                          text check (side in ('YES', 'NO')),
  amount_smallest_unit          bigint,
  price                         numeric,
  shares                        numeric,
  position_value_smallest_unit  bigint,
  metadata                      jsonb,
  created_at                    timestamptz default now()
);

-- ============================================================
-- 13. MARKET_RESOLUTION_LOGS
-- ============================================================
create table if not exists public.market_resolution_logs (
  id                            uuid primary key default gen_random_uuid(),
  market_id                     text not null references public.markets(id) on delete cascade,
  resolved_by                   uuid references auth.users(id),
  outcome                       text not null,
  winning_pool_smallest_unit    bigint,
  losing_pool_smallest_unit     bigint,
  payout_pool_smallest_unit     bigint,
  resolved_position_count       integer,
  payout_summary                jsonb,
  created_at                    timestamptz default now()
);

-- ============================================================
-- 14. SAVED_BANK_DETAILS
-- ============================================================
create table if not exists public.saved_bank_details (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  bank_name       text not null,
  account_number  text not null,
  account_name    text not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id)
);

-- ============================================================
-- 15. ADMIN_AUDIT_LOG
-- ============================================================
create table if not exists public.admin_audit_log (
  id              uuid primary key default gen_random_uuid(),
  action          text not null,
  actor_id        uuid references auth.users(id),
  actor_email     text,
  actor_role      text,
  target_type     text,
  target_id       text,
  target_label    text,
  details         jsonb,
  created_at      timestamptz default now()
);

-- ============================================================
-- 16. PROFILES (extends auth.users, legacy)
-- ============================================================
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text,
  display_name          text,
  email                 text,
  balance               numeric default 0,
  avatar_url            text,
  profile_image_url     text,
  created_at            timestamptz default now()
);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
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
