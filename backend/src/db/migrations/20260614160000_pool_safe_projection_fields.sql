-- Flippe pool-safe MVP projection fields.
-- Prices are sentiment/entry indicators. Active position projections estimate
-- what the position would receive if the market resolved at the current pool.
-- Final settlement must remain bounded by total locked market stakes.

alter table public.positions add column if not exists projected_payout_smallest_unit bigint not null default 0;
alter table public.positions add column if not exists projected_profit_smallest_unit bigint not null default 0;
alter table public.positions add column if not exists last_valued_at timestamptz;

comment on column public.positions.projected_payout_smallest_unit is
  'Projected payout if the market resolved at current pools. Not withdrawable and not final until settlement.';

comment on column public.positions.projected_profit_smallest_unit is
  'Projected profit/loss if the market resolved at current pools. Not withdrawable and not final until settlement.';

comment on column public.positions.last_valued_at is
  'Timestamp of the latest projected valuation calculation.';

comment on column public.positions.ownership_percent is
  'Deprecated for user-facing display. Use live side share from shares_owned / current total side shares instead.';
