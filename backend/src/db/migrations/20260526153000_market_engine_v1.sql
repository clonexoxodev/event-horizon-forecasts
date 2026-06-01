-- Flippe V1 market engine lifecycle support.
-- Run in Supabase SQL editor before production testing if these columns/tables
-- are not already present.

alter table public.markets add column if not exists status text default 'active';
alter table public.markets add column if not exists market_type text default 'binary';
alter table public.markets add column if not exists yes_price numeric not null default 50;
alter table public.markets add column if not exists no_price numeric not null default 50;
alter table public.markets add column if not exists yes_pool_smallest_unit bigint not null default 0;
alter table public.markets add column if not exists no_pool_smallest_unit bigint not null default 0;
alter table public.markets add column if not exists seed_liquidity_yes_smallest_unit bigint not null default 50000;
alter table public.markets add column if not exists seed_liquidity_no_smallest_unit bigint not null default 50000;
alter table public.markets add column if not exists pool_amount_smallest_unit bigint not null default 0;
alter table public.markets add column if not exists total_volume_smallest_unit bigint not null default 0;
alter table public.markets add column if not exists participant_count integer not null default 0;
alter table public.markets add column if not exists trade_count integer not null default 0;
alter table public.markets add column if not exists closes_at timestamptz;
alter table public.markets add column if not exists close_date timestamptz;
alter table public.markets add column if not exists resolved_at timestamptz;
alter table public.markets add column if not exists resolved_outcome text;
alter table public.markets add column if not exists winning_outcome text;
alter table public.markets add column if not exists outcome text;
alter table public.markets add column if not exists resolved_by uuid references public.users(id) on delete set null;
alter table public.markets add column if not exists image_url text;
alter table public.markets add column if not exists video_url text;
alter table public.markets add column if not exists rules text;
alter table public.markets add column if not exists resolution_instructions text;
alter table public.markets add column if not exists min_position_smallest_unit bigint not null default 10000;
alter table public.markets add column if not exists max_position_smallest_unit bigint;
alter table public.markets add column if not exists created_by uuid references public.users(id) on delete set null;
alter table public.markets add column if not exists archived_at timestamptz;
alter table public.markets add column if not exists updated_at timestamptz not null default now();
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists profile_image_url text;
alter table public.users add column if not exists updated_at timestamptz not null default now();

alter table public.notifications add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications drop constraint if exists valid_notification_type;
alter table public.notifications drop constraint if exists notifications_type_v1_check;
alter table public.notifications
  add constraint notifications_type_v1_check
  check (type in (
    'forecast_confirmed',
    'market_closing_soon',
    'market_moved_significantly',
    'market_resolved',
    'position_sold',
    'position_won',
    'position_lost',
    'position_payout',
    'new_market_available',
    'deposit_confirmed',
    'withdrawal_confirmed',
    'wallet_low'
  ));

alter table public.markets drop constraint if exists markets_status_check;
alter table public.markets drop constraint if exists status_enum;
alter table public.markets drop constraint if exists valid_market_status;
alter table public.markets drop constraint if exists markets_status_v1_check;
alter table public.markets
  add constraint markets_status_v1_check
  check (status in ('draft', 'active', 'closed', 'pending_resolution', 'resolved', 'cancelled', 'archived', 'open', 'paused'));

create table if not exists public.market_trades (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  position_id uuid references public.positions(id) on delete set null,
  side text not null check (side in ('YES', 'NO')),
  amount_smallest_unit bigint not null check (amount_smallest_unit > 0),
  price_before numeric not null,
  price_after numeric not null,
  yes_price_after numeric not null,
  no_price_after numeric not null,
  currency text not null default 'NGN',
  created_at timestamptz not null default now()
);

create table if not exists public.market_price_history (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  yes_price numeric not null,
  no_price numeric not null,
  yes_pool_smallest_unit bigint not null default 0,
  no_pool_smallest_unit bigint not null default 0,
  volume_smallest_unit bigint not null default 0,
  trade_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint market_price_history_sum check (yes_price + no_price = 100)
);

alter table public.market_price_history add column if not exists market_id uuid;
alter table public.market_price_history add column if not exists yes_price numeric not null default 50;
alter table public.market_price_history add column if not exists no_price numeric not null default 50;
alter table public.market_price_history add column if not exists yes_pool_smallest_unit bigint not null default 0;
alter table public.market_price_history add column if not exists no_pool_smallest_unit bigint not null default 0;
alter table public.market_price_history add column if not exists volume_smallest_unit bigint not null default 0;
alter table public.market_price_history add column if not exists trade_count integer not null default 0;
alter table public.market_price_history add column if not exists side text check (side in ('YES', 'NO'));
alter table public.market_price_history add column if not exists amount_smallest_unit bigint not null default 0;
alter table public.market_price_history add column if not exists created_at timestamptz not null default now();

create table if not exists public.market_resolution_logs (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  resolved_by uuid references public.users(id) on delete set null,
  outcome text not null check (outcome in ('YES', 'NO')),
  winning_pool_smallest_unit bigint not null default 0,
  losing_pool_smallest_unit bigint not null default 0,
  payout_pool_smallest_unit bigint not null default 0,
  resolved_position_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.market_resolution_logs add column if not exists payout_summary jsonb;

alter table public.positions add column if not exists entry_price numeric;
alter table public.positions add column if not exists entry_yes_price numeric;
alter table public.positions add column if not exists entry_no_price numeric;
alter table public.positions add column if not exists stake_amount numeric;
alter table public.positions add column if not exists price_at_purchase numeric;
alter table public.positions add column if not exists shares_received numeric not null default 0;
alter table public.positions add column if not exists estimated_payout_at_purchase numeric;
alter table public.positions add column if not exists estimated_profit_at_purchase numeric;
alter table public.positions add column if not exists estimated_payout_smallest_unit bigint;
alter table public.positions add column if not exists estimated_profit_smallest_unit bigint;
alter table public.positions add column if not exists final_payout_smallest_unit bigint;
alter table public.positions add column if not exists profit_smallest_unit bigint;
alter table public.positions add column if not exists status text not null default 'active';
alter table public.positions add column if not exists potential_return_smallest_unit bigint;
alter table public.positions add column if not exists is_winner boolean;
alter table public.positions add column if not exists payout_smallest_unit bigint;
alter table public.positions add column if not exists resolved_at timestamptz;
alter table public.positions add column if not exists settled_at timestamptz;
alter table public.positions add column if not exists winning_outcome text check (winning_outcome in ('YES', 'NO'));
alter table public.positions add column if not exists market_question_snapshot text;
alter table public.positions add column if not exists market_category_snapshot text;

alter table public.transactions add column if not exists market_id uuid references public.markets(id) on delete set null;
alter table public.transactions add column if not exists position_id uuid references public.positions(id) on delete set null;

create or replace view public.user_positions as
select * from public.positions;

create or replace view public.wallet_transactions as
select * from public.transactions;

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do update set public = true;

create index if not exists idx_markets_status_close on public.markets(status, closes_at);
create index if not exists idx_market_trades_market_created on public.market_trades(market_id, created_at);
create index if not exists idx_market_price_history_market_created on public.market_price_history(market_id, created_at);
create index if not exists idx_market_resolution_logs_market on public.market_resolution_logs(market_id);
