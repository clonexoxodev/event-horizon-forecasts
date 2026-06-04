-- Flippe V2 market engine: ownership shares, live position value, and pool-safe settlement.
-- Safe additive migration. Old V1 liquidity/payout columns are kept for compatibility
-- but the V2 application path should no longer require admin-funded liquidity.

alter table public.markets add column if not exists pricing_model text not null default 'ownership_shares';
alter table public.markets add column if not exists starting_yes_price numeric not null default 50;
alter table public.markets add column if not exists starting_no_price numeric not null default 50;
alter table public.markets add column if not exists yes_volume_smallest_unit bigint not null default 0;
alter table public.markets add column if not exists no_volume_smallest_unit bigint not null default 0;
alter table public.markets add column if not exists total_yes_shares numeric not null default 0;
alter table public.markets add column if not exists total_no_shares numeric not null default 0;
alter table public.markets add column if not exists settlement_pool_smallest_unit bigint not null default 0;
alter table public.markets add column if not exists platform_fee_bps integer not null default 0;

alter table public.markets drop constraint if exists markets_starting_prices_sum_v2_check;
alter table public.markets
  add constraint markets_starting_prices_sum_v2_check
  check (round(starting_yes_price + starting_no_price) = 100);

alter table public.markets drop constraint if exists markets_pricing_model_v2_check;
alter table public.markets
  add constraint markets_pricing_model_v2_check
  check (pricing_model in ('ownership_shares', 'legacy_fixed_share', 'legacy_pool'));

alter table public.positions add column if not exists shares_owned numeric not null default 0;
alter table public.positions add column if not exists entry_price numeric;
alter table public.positions add column if not exists current_price numeric;
alter table public.positions add column if not exists current_value_smallest_unit bigint not null default 0;
alter table public.positions add column if not exists ownership_percent numeric not null default 0;
alter table public.positions add column if not exists settlement_payout_smallest_unit bigint not null default 0;
alter table public.positions add column if not exists settlement_profit_smallest_unit bigint not null default 0;
alter table public.positions add column if not exists market_question_snapshot text;
alter table public.positions add column if not exists market_category_snapshot text;

update public.positions
set shares_owned = coalesce(nullif(shares_owned, 0), nullif(shares_received, 0), 0)
where coalesce(shares_owned, 0) = 0 and coalesce(shares_received, 0) > 0;

update public.positions
set entry_price = coalesce(entry_price, price_at_purchase)
where entry_price is null and price_at_purchase is not null;

alter table public.market_price_history add column if not exists yes_volume_smallest_unit bigint not null default 0;
alter table public.market_price_history add column if not exists no_volume_smallest_unit bigint not null default 0;
alter table public.market_price_history add column if not exists total_yes_shares numeric not null default 0;
alter table public.market_price_history add column if not exists total_no_shares numeric not null default 0;

create table if not exists public.market_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  position_id uuid references public.positions(id) on delete set null,
  event_type text not null,
  side text check (side in ('YES', 'NO')),
  amount_smallest_unit bigint not null default 0,
  price numeric,
  shares numeric not null default 0,
  position_value_smallest_unit bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.market_activity_events drop constraint if exists market_activity_events_type_v2_check;
alter table public.market_activity_events
  add constraint market_activity_events_type_v2_check
  check (event_type in (
    'bought_yes',
    'bought_no',
    'position_value_increase',
    'position_value_decrease',
    'market_closed',
    'market_resolved',
    'ownership_changed',
    'settlement_payout',
    'settlement_loss'
  ));

create table if not exists public.portfolio_value_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  total_value_smallest_unit bigint not null default 0,
  daily_change_smallest_unit bigint not null default 0,
  daily_change_percent numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_market_activity_market_created on public.market_activity_events(market_id, created_at desc);
create index if not exists idx_market_activity_user_created on public.market_activity_events(user_id, created_at desc);
create index if not exists idx_portfolio_value_user_created on public.portfolio_value_history(user_id, created_at desc);

-- Carry V1 starting prices into V2 fields for existing rows when possible.
update public.markets
set starting_yes_price = coalesce(nullif(starting_yes_price, 50), yes_price, 50),
    starting_no_price = 100 - coalesce(nullif(starting_yes_price, 50), yes_price, 50)
where coalesce(yes_price, 50) + coalesce(no_price, 50) = 100;
