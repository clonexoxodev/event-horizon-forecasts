-- Flippe admin operations support tables.
-- Safe additive migration for real admin metrics/actions that should not be mocked.

create extension if not exists pgcrypto;

alter table public.users add column if not exists last_login_at timestamptz;
alter table public.users add column if not exists last_active_at timestamptz;
alter table public.users add column if not exists account_status text not null default 'active';
alter table public.users add column if not exists suspended_at timestamptz;
alter table public.users add column if not exists suspended_by uuid references public.users(id) on delete set null;
alter table public.users add column if not exists suspension_reason text;

alter table public.users drop constraint if exists users_account_status_v1_check;
alter table public.users
  add constraint users_account_status_v1_check
  check (account_status in ('active', 'suspended', 'closed'));

alter table public.markets add column if not exists payout_status text not null default 'not_applicable';
alter table public.markets add column if not exists payout_completed_at timestamptz;
alter table public.markets add column if not exists archived_at timestamptz;
alter table public.markets add column if not exists archive_reason text;
alter table public.markets add column if not exists cancelled_at timestamptz;
alter table public.markets add column if not exists cancel_reason text;

alter table public.markets drop constraint if exists markets_payout_status_v1_check;
alter table public.markets
  add constraint markets_payout_status_v1_check
  check (payout_status in ('not_applicable', 'pending', 'processing', 'completed', 'failed'));

create table if not exists public.user_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  event_type text not null,
  route text,
  market_id uuid references public.markets(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_activity_logs_user_created
  on public.user_activity_logs(user_id, created_at desc);
create index if not exists idx_user_activity_logs_event_created
  on public.user_activity_logs(event_type, created_at desc);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_created
  on public.admin_audit_logs(created_at desc);
create index if not exists idx_admin_audit_logs_admin_created
  on public.admin_audit_logs(admin_user_id, created_at desc);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value, description)
values
  ('platform_status', '{"status":"online","maintenanceMode":false}'::jsonb, 'Public platform availability controls.'),
  ('prediction_limits', '{"minAmount":100,"maxAmount":100000}'::jsonb, 'Default prediction amount limits in NGN.')
on conflict (key) do nothing;

create table if not exists public.payout_records (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  position_id uuid references public.positions(id) on delete set null,
  user_id uuid references public.users(id) on delete cascade,
  amount_smallest_unit bigint not null default 0,
  status text not null default 'pending',
  transaction_id uuid references public.transactions(id) on delete set null,
  processed_by uuid references public.users(id) on delete set null,
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.payout_records drop constraint if exists payout_records_status_v1_check;
alter table public.payout_records
  add constraint payout_records_status_v1_check
  check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled'));

create unique index if not exists idx_payout_records_position_once
  on public.payout_records(position_id)
  where position_id is not null;
create index if not exists idx_payout_records_market_status
  on public.payout_records(market_id, status);

create table if not exists public.dispute_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  market_id uuid references public.markets(id) on delete set null,
  issue_type text not null,
  description text not null,
  evidence_url text,
  status text not null default 'open',
  assigned_to uuid references public.users(id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dispute_reports drop constraint if exists dispute_reports_status_v1_check;
alter table public.dispute_reports
  add constraint dispute_reports_status_v1_check
  check (status in ('open', 'reviewing', 'resolved', 'rejected'));

create index if not exists idx_dispute_reports_status_created
  on public.dispute_reports(status, created_at desc);
create index if not exists idx_dispute_reports_market_created
  on public.dispute_reports(market_id, created_at desc);
