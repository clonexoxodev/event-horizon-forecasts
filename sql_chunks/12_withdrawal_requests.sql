-- RUN 12th: Create withdrawal_requests table (fixes old schema if needed)

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='withdrawal_requests') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='withdrawal_requests' AND column_name='amount'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='withdrawal_requests' AND column_name='amount_smallest_unit'
    ) THEN
      DROP POLICY IF EXISTS "withdrawal_requests: own read" ON public.withdrawal_requests;
      DROP POLICY IF EXISTS "withdrawal_requests: own insert" ON public.withdrawal_requests;
      DROP TABLE public.withdrawal_requests;
    END IF;
  END IF;
END $$;

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

create index if not exists idx_withdrawal_requests_status on public.withdrawal_requests(status);
create index if not exists idx_withdrawal_requests_user_id on public.withdrawal_requests(user_id);
create index if not exists idx_withdrawal_requests_created_at on public.withdrawal_requests(created_at desc);
