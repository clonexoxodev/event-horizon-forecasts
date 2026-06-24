-- FLIPPE final wallet/admin functionality support.
-- Safe to run after earlier Wallet V1 migrations. Uses IF EXISTS / IF NOT EXISTS where possible.

create extension if not exists pgcrypto;

alter table public.users
  add column if not exists role text not null default 'user';

alter table public.withdrawal_requests drop constraint if exists withdrawal_requests_status_check;
alter table public.withdrawal_requests drop constraint if exists withdrawal_requests_status_v1_check;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'users_role_v1_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users drop constraint users_role_v1_check;
  end if;
end $$;

alter table public.users
  add constraint users_role_v1_check check (role in ('user', 'admin', 'super_admin'));

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  wallet_id uuid references public.wallets(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount_smallest_unit bigint not null check (amount_smallest_unit > 0),
  currency text not null default 'NGN',
  reference text not null unique,
  provider text not null default 'manual',
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  review_tier text,
  status text not null default 'pending',
  admin_note text,
  save_bank_details boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references public.users(id) on delete set null,
  rejected_at timestamptz,
  processed_by uuid references public.users(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.withdrawal_requests add column if not exists wallet_id uuid references public.wallets(id) on delete set null;
alter table public.withdrawal_requests add column if not exists transaction_id uuid references public.transactions(id) on delete set null;
alter table public.withdrawal_requests add column if not exists provider text not null default 'manual';
alter table public.withdrawal_requests add column if not exists review_tier text;
alter table public.withdrawal_requests add column if not exists admin_note text;
alter table public.withdrawal_requests add column if not exists save_bank_details boolean not null default false;
alter table public.withdrawal_requests add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.withdrawal_requests add column if not exists approved_by uuid references public.users(id) on delete set null;
alter table public.withdrawal_requests add column if not exists approved_at timestamptz;
alter table public.withdrawal_requests add column if not exists rejected_by uuid references public.users(id) on delete set null;
alter table public.withdrawal_requests add column if not exists rejected_at timestamptz;
alter table public.withdrawal_requests add column if not exists processed_by uuid references public.users(id) on delete set null;
alter table public.withdrawal_requests add column if not exists processed_at timestamptz;
alter table public.withdrawal_requests add column if not exists updated_at timestamptz not null default now();

alter table public.transactions drop constraint if exists valid_transaction_type;
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions drop constraint if exists transactions_type_v1_check;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'withdrawal_requests_status_v1_check'
      and conrelid = 'public.withdrawal_requests'::regclass
  ) then
    alter table public.withdrawal_requests drop constraint withdrawal_requests_status_v1_check;
  end if;
end $$;

alter table public.withdrawal_requests
  add constraint withdrawal_requests_status_v1_check
  check (status in ('pending', 'approved', 'denied', 'paid', 'completed', 'rejected', 'failed'));

create index if not exists withdrawal_requests_user_idx on public.withdrawal_requests(user_id, created_at desc);
create index if not exists withdrawal_requests_status_idx on public.withdrawal_requests(status, created_at desc);

create table if not exists public.saved_bank_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.transactions add column if not exists approved_by uuid references public.users(id) on delete set null;
alter table public.transactions add column if not exists approved_at timestamptz;
alter table public.transactions add column if not exists updated_at timestamptz not null default now();

alter table public.transactions drop constraint if exists valid_transaction_direction;
alter table public.transactions drop constraint if exists transactions_direction_check;
alter table public.transactions drop constraint if exists transactions_direction_v1_check;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'transactions_type_v1_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions drop constraint transactions_type_v1_check;
  end if;
end $$;

alter table public.transactions
  add constraint transactions_type_v1_check
  check (type in (
    'deposit',
    'withdrawal',
    'position_entry',
    'position_payout',
    'refund',
    'deposit_request',
    'deposit_approved',
    'deposit_rejected',
    'withdrawal_request',
    'withdrawal_approved',
    'withdrawal_rejected',
    'prediction_stake',
    'market_payout',
    'admin_adjustment'
  ));

alter table public.transactions drop constraint if exists valid_transaction_status;
alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions drop constraint if exists transactions_status_v1_check;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'transactions_direction_v1_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions drop constraint transactions_direction_v1_check;
  end if;
end $$;

alter table public.transactions
  add constraint transactions_direction_v1_check check (direction in ('IN', 'OUT', 'HOLD', 'RELEASE'));

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'transactions_status_v1_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions drop constraint transactions_status_v1_check;
  end if;
end $$;

alter table public.transactions
  add constraint transactions_status_v1_check check (status in ('pending', 'completed', 'failed', 'rejected'));

alter table public.wallets add column if not exists locked_ngn_kobo bigint not null default 0;
alter table public.wallets add column if not exists total_withdrawn_ngn_kobo bigint not null default 0;
alter table public.wallets add column if not exists updated_at timestamptz not null default now();
