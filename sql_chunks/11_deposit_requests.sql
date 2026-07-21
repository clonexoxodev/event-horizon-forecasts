-- RUN 11th: Create deposit_requests table

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

create index if not exists idx_deposit_requests_status on public.deposit_requests(status);
create index if not exists idx_deposit_requests_user_id on public.deposit_requests(user_id);
create index if not exists idx_deposit_requests_created_at on public.deposit_requests(created_at desc);
