-- Flippe Wallet V1: manual deposit/withdrawal requests, finance ledger fields, and admin queues.

alter table public.wallets add column if not exists locked_ngn_kobo bigint not null default 0;
alter table public.wallets add column if not exists total_deposited_ngn_kobo bigint not null default 0;
alter table public.wallets add column if not exists total_withdrawn_ngn_kobo bigint not null default 0;
alter table public.wallets add column if not exists total_winnings_ngn_kobo bigint not null default 0;
alter table public.wallets add column if not exists total_staked_ngn_kobo bigint not null default 0;
alter table public.wallets add column if not exists currency text not null default 'NGN';
alter table public.wallets add column if not exists updated_at timestamptz not null default now();

alter table public.transactions add column if not exists reference text;
alter table public.transactions add column if not exists description text;
alter table public.transactions add column if not exists market_id uuid references public.markets(id) on delete set null;
alter table public.transactions add column if not exists position_id uuid references public.positions(id) on delete set null;
alter table public.transactions add column if not exists approved_by uuid references public.users(id) on delete set null;
alter table public.transactions add column if not exists approved_at timestamptz;
alter table public.transactions add column if not exists updated_at timestamptz not null default now();

alter table public.transactions drop constraint if exists valid_transaction_type;
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions drop constraint if exists transactions_type_v1_check;
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

alter table public.transactions drop constraint if exists valid_transaction_direction;
alter table public.transactions drop constraint if exists transactions_direction_check;
alter table public.transactions drop constraint if exists transactions_direction_v1_check;
alter table public.transactions
  add constraint transactions_direction_v1_check
  check (direction in ('IN', 'OUT', 'HOLD', 'RELEASE'));

alter table public.transactions drop constraint if exists valid_transaction_status;
alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions drop constraint if exists transactions_status_v1_check;
alter table public.transactions
  add constraint transactions_status_v1_check
  check (status in ('pending', 'completed', 'failed', 'rejected'));

alter table public.transactions drop constraint if exists transactions_reference_type_check;
alter table public.transactions drop constraint if exists valid_reference_type;
alter table public.transactions drop constraint if exists transactions_reference_type_v1_check;
alter table public.transactions
  add constraint transactions_reference_type_v1_check
  check (
    reference_type is null
    or reference_type in ('position', 'deposit', 'withdrawal', 'deposit_request', 'withdrawal_request', 'market')
  );

create table if not exists public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount_smallest_unit bigint not null check (amount_smallest_unit > 0),
  currency text not null default 'NGN',
  reference text not null unique,
  provider text not null default 'manual',
  payment_instruction text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected', 'failed')),
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references public.users(id) on delete set null,
  rejected_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount_smallest_unit bigint not null check (amount_smallest_unit > 0),
  currency text not null default 'NGN',
  reference text not null unique,
  provider text not null default 'manual',
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  review_tier text not null default 'standard',
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected', 'failed')),
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references public.users(id) on delete set null,
  rejected_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications drop constraint if exists valid_notification_type;
alter table public.notifications drop constraint if exists notifications_type_v1_check;

update public.notifications
set
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('legacy_type', type),
  type = 'system'
where type not in (
  'forecast_confirmed',
  'market_ended',
  'market_resolved',
  'market_payout',
  'new_market',
  'wallet_low',
  'deposit_request_created',
  'deposit_approved',
  'deposit_rejected',
  'withdrawal_requested',
  'withdrawal_approved',
  'withdrawal_rejected',
  'system'
);

alter table public.notifications
  add constraint notifications_type_v1_check
  check (type in (
    'forecast_confirmed',
    'market_ended',
    'market_resolved',
    'market_payout',
    'new_market',
    'wallet_low',
    'deposit_request_created',
    'deposit_approved',
    'deposit_rejected',
    'withdrawal_requested',
    'withdrawal_approved',
    'withdrawal_rejected',
    'system'
  ));

create index if not exists idx_deposit_requests_status_created_at on public.deposit_requests(status, created_at desc);
create index if not exists idx_deposit_requests_user_id on public.deposit_requests(user_id, created_at desc);
create index if not exists idx_withdrawal_requests_status_created_at on public.withdrawal_requests(status, created_at desc);
create index if not exists idx_withdrawal_requests_user_id on public.withdrawal_requests(user_id, created_at desc);
create index if not exists idx_transactions_reference on public.transactions(reference);
create index if not exists idx_transactions_type_status_created_at on public.transactions(type, status, created_at desc);
