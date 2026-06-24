-- FLIPPE Market Activation system.
-- Adds configurable activation thresholds and allows markets to become refunded.

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value, description)
values (
  'market_activation',
  jsonb_build_object(
    'totalPoolSmallestUnit', 1000000,
    'yesPoolSmallestUnit', 200000,
    'noPoolSmallestUnit', 200000,
    'minimumParticipants', 5,
    'buildingMaxStakeSmallestUnit', 100000
  ),
  'Activation requirements before a market becomes live. Values are in kobo.'
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

alter table public.markets add column if not exists activation_state text not null default 'building';
alter table public.markets add column if not exists activated_at timestamptz;
alter table public.markets add column if not exists refunded_at timestamptz;
alter table public.markets add column if not exists activation_snapshot jsonb not null default '{}'::jsonb;

alter table public.markets drop constraint if exists markets_activation_state_check;
alter table public.markets
  add constraint markets_activation_state_check
  check (activation_state in ('building', 'live', 'resolved', 'refunded'));

alter table public.markets drop constraint if exists markets_status_check;
alter table public.markets drop constraint if exists status_enum;
alter table public.markets drop constraint if exists valid_market_status;
alter table public.markets drop constraint if exists markets_status_v1_check;
alter table public.markets
  add constraint markets_status_v1_check
  check (status in ('draft', 'active', 'closed', 'pending_resolution', 'resolved', 'cancelled', 'archived', 'open', 'paused', 'refunded'));

create index if not exists idx_markets_activation_state on public.markets(activation_state, status);

create unique index if not exists idx_transactions_one_completed_refund_per_position
  on public.transactions(position_id)
  where type = 'refund' and status = 'completed' and position_id is not null;
