-- ============================================================
-- Flippe - Complete Admin Panel Support Migration
-- Created: 2026-07-20
-- Covers ALL 16 tables referenced by backend/api/index.ts
-- ============================================================

-- ============================================================
-- HELPER: safely add a column if it doesn't exist
-- ============================================================
create or replace function public.add_column_if_missing(
  p_table text, p_column text, p_type text, p_default text default null
) returns void
language plpgsql as $$
declare
  v_sql text;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = p_table and column_name = p_column
  ) then
    v_sql := format('alter table public.%I add column %I %s', p_table, p_column, p_type);
    if p_default is not null then
      v_sql := v_sql || format(' default %s', p_default);
    end if;
    execute v_sql;
  end if;
end;
$$;

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
select public.add_column_if_missing('users', 'name', 'text');
select public.add_column_if_missing('users', 'avatar_url', 'text');
select public.add_column_if_missing('users', 'profile_image_url', 'text');
select public.add_column_if_missing('users', 'account_status', 'text', quote_literal('active'));
select public.add_column_if_missing('users', 'suspended_at', 'timestamptz');
select public.add_column_if_missing('users', 'suspended_by', 'uuid');
select public.add_column_if_missing('users', 'suspension_reason', 'text');
select public.add_column_if_missing('users', 'password_hash', 'text');
select public.add_column_if_missing('users', 'updated_at', 'timestamptz', 'now()');

-- ============================================================
-- 2. WALLETS TABLE
-- ============================================================
select public.add_column_if_missing('wallets', 'balance_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'balance_usd_cents', 'bigint', '0');
select public.add_column_if_missing('wallets', 'available_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'available_usd_cents', 'bigint', '0');
select public.add_column_if_missing('wallets', 'locked_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'locked_usd_cents', 'bigint', '0');
select public.add_column_if_missing('wallets', 'total_deposited_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'total_withdrawn_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'total_winnings_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'total_staked_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'currency', 'text', quote_literal('NGN'));
select public.add_column_if_missing('wallets', 'updated_at', 'timestamptz', 'now()');

-- ============================================================
-- 3. MARKETS TABLE
-- ============================================================
select public.add_column_if_missing('markets', 'status', 'text', quote_literal('active'));
select public.add_column_if_missing('markets', 'state', 'text', quote_literal('trading'));
select public.add_column_if_missing('markets', 'market_type', 'text', quote_literal('binary'));
select public.add_column_if_missing('markets', 'currency', 'text', quote_literal('NGN'));
select public.add_column_if_missing('markets', 'updated_at', 'timestamptz', 'now()');
select public.add_column_if_missing('markets', 'yes_label', 'text', quote_literal('YES'));
select public.add_column_if_missing('markets', 'no_label', 'text', quote_literal('NO'));
select public.add_column_if_missing('markets', 'yes_price', 'numeric', '0.5');
select public.add_column_if_missing('markets', 'no_price', 'numeric', '0.5');
select public.add_column_if_missing('markets', 'pricing_model', 'text', quote_literal('dynamic'));
select public.add_column_if_missing('markets', 'starting_yes_price', 'numeric');
select public.add_column_if_missing('markets', 'starting_no_price', 'numeric');
select public.add_column_if_missing('markets', 'pool_amount_smallest_unit', 'bigint', '0');
select public.add_column_if_missing('markets', 'settlement_pool_smallest_unit', 'bigint', '0');
select public.add_column_if_missing('markets', 'yes_pool_smallest_unit', 'bigint', '0');
select public.add_column_if_missing('markets', 'no_pool_smallest_unit', 'bigint', '0');
select public.add_column_if_missing('markets', 'yes_volume_smallest_unit', 'bigint', '0');
select public.add_column_if_missing('markets', 'no_volume_smallest_unit', 'bigint', '0');
select public.add_column_if_missing('markets', 'total_volume_smallest_unit', 'bigint', '0');
select public.add_column_if_missing('markets', 'seed_liquidity_yes_smallest_unit', 'bigint', '0');
select public.add_column_if_missing('markets', 'seed_liquidity_no_smallest_unit', 'bigint', '0');
select public.add_column_if_missing('markets', 'total_yes_shares', 'numeric', '0');
select public.add_column_if_missing('markets', 'total_no_shares', 'numeric', '0');
select public.add_column_if_missing('markets', 'participant_count', 'integer', '0');
select public.add_column_if_missing('markets', 'trade_count', 'integer', '0');
select public.add_column_if_missing('markets', 'close_date', 'timestamptz');
select public.add_column_if_missing('markets', 'trading_close_at', 'timestamptz');
select public.add_column_if_missing('markets', 'resolution_date', 'timestamptz');
select public.add_column_if_missing('markets', 'resolution_source', 'text');
select public.add_column_if_missing('markets', 'resolution_instructions', 'text');
select public.add_column_if_missing('markets', 'outcome', 'text');
select public.add_column_if_missing('markets', 'winning_outcome', 'text');
select public.add_column_if_missing('markets', 'resolved_outcome', 'text');
select public.add_column_if_missing('markets', 'resolved_at', 'timestamptz');
select public.add_column_if_missing('markets', 'resolved_by', 'uuid');
select public.add_column_if_missing('markets', 'refunded_at', 'timestamptz');
select public.add_column_if_missing('markets', 'refund_reason', 'text');
select public.add_column_if_missing('markets', 'refund_status', 'text');
select public.add_column_if_missing('markets', 'refunded_by', 'uuid');
select public.add_column_if_missing('markets', 'payout_status', 'text');
select public.add_column_if_missing('markets', 'payout_completed_at', 'timestamptz');
select public.add_column_if_missing('markets', 'activation_state', 'text', quote_literal('pre_activation'));
select public.add_column_if_missing('markets', 'activated_at', 'timestamptz');
select public.add_column_if_missing('markets', 'activated_by', 'uuid');
select public.add_column_if_missing('markets', 'activation_snapshot', 'jsonb');
select public.add_column_if_missing('markets', 'protected_market_enabled', 'boolean', 'false');
select public.add_column_if_missing('markets', 'activation_threshold_smallest_unit', 'bigint');
select public.add_column_if_missing('markets', 'activation_yes_min_smallest_unit', 'bigint');
select public.add_column_if_missing('markets', 'activation_no_min_smallest_unit', 'bigint');
select public.add_column_if_missing('markets', 'activation_min_participants', 'integer');
select public.add_column_if_missing('markets', 'protected_max_stake_smallest_unit', 'bigint');
select public.add_column_if_missing('markets', 'image_url', 'text');
select public.add_column_if_missing('markets', 'video_url', 'text');
select public.add_column_if_missing('markets', 'is_trending', 'boolean', 'false');
select public.add_column_if_missing('markets', 'min_position_smallest_unit', 'bigint');
select public.add_column_if_missing('markets', 'max_position_smallest_unit', 'bigint');
select public.add_column_if_missing('markets', 'created_by', 'uuid');
select public.add_column_if_missing('markets', 'country_filter', 'text');
select public.add_column_if_missing('markets', 'rules', 'text');
select public.add_column_if_missing('markets', 'archived_at', 'timestamptz');

-- ============================================================
-- 4. POSITIONS TABLE
-- ============================================================
select public.add_column_if_missing('positions', 'status', 'text', quote_literal('open'));
select public.add_column_if_missing('positions', 'amount_smallest_unit', 'bigint');
select public.add_column_if_missing('positions', 'stake_amount', 'bigint');
select public.add_column_if_missing('positions', 'currency', 'text', quote_literal('NGN'));
select public.add_column_if_missing('positions', 'potential_return_smallest_unit', 'bigint');
select public.add_column_if_missing('positions', 'estimated_payout_smallest_unit', 'bigint');
select public.add_column_if_missing('positions', 'estimated_profit_smallest_unit', 'bigint');
select public.add_column_if_missing('positions', 'estimated_payout_at_purchase', 'bigint');
select public.add_column_if_missing('positions', 'estimated_profit_at_purchase', 'bigint');
select public.add_column_if_missing('positions', 'shares_received', 'numeric');
select public.add_column_if_missing('positions', 'shares_owned', 'numeric');
select public.add_column_if_missing('positions', 'price_at_purchase', 'numeric');
select public.add_column_if_missing('positions', 'entry_price', 'numeric');
select public.add_column_if_missing('positions', 'current_price', 'numeric');
select public.add_column_if_missing('positions', 'current_value_smallest_unit', 'bigint');
select public.add_column_if_missing('positions', 'ownership_percent', 'numeric');
select public.add_column_if_missing('positions', 'is_winner', 'boolean');
select public.add_column_if_missing('positions', 'payout_smallest_unit', 'bigint');
select public.add_column_if_missing('positions', 'final_payout_smallest_unit', 'bigint');
select public.add_column_if_missing('positions', 'settlement_payout_smallest_unit', 'bigint');
select public.add_column_if_missing('positions', 'settlement_profit_smallest_unit', 'bigint');
select public.add_column_if_missing('positions', 'profit_smallest_unit', 'bigint');
select public.add_column_if_missing('positions', 'winning_outcome', 'text');
select public.add_column_if_missing('positions', 'resolved_at', 'timestamptz');
select public.add_column_if_missing('positions', 'settled_at', 'timestamptz');
select public.add_column_if_missing('positions', 'market_question_snapshot', 'text');
select public.add_column_if_missing('positions', 'market_category_snapshot', 'text');
select public.add_column_if_missing('positions', 'outcome', 'text');

-- ============================================================
-- 5. TRANSACTIONS TABLE
-- ============================================================
select public.add_column_if_missing('transactions', 'status', 'text', quote_literal('pending'));
select public.add_column_if_missing('transactions', 'reference', 'text');
select public.add_column_if_missing('transactions', 'reference_id', 'text');
select public.add_column_if_missing('transactions', 'reference_type', 'text');
select public.add_column_if_missing('transactions', 'description', 'text');
select public.add_column_if_missing('transactions', 'metadata', 'jsonb');
select public.add_column_if_missing('transactions', 'market_id', 'text');
select public.add_column_if_missing('transactions', 'position_id', 'uuid');
select public.add_column_if_missing('transactions', 'approved_by', 'uuid');
select public.add_column_if_missing('transactions', 'approved_at', 'timestamptz');
select public.add_column_if_missing('transactions', 'updated_at', 'timestamptz', 'now()');

-- ============================================================
-- 6. NOTIFICATIONS TABLE
-- ============================================================
select public.add_column_if_missing('notifications', 'user_id', 'uuid');
select public.add_column_if_missing('notifications', 'type', 'text');
select public.add_column_if_missing('notifications', 'title', 'text');
select public.add_column_if_missing('notifications', 'message', 'text');
select public.add_column_if_missing('notifications', 'reference_id', 'text');
select public.add_column_if_missing('notifications', 'reference_type', 'text');
select public.add_column_if_missing('notifications', 'metadata', 'jsonb');
select public.add_column_if_missing('notifications', 'is_read', 'boolean', 'false');
select public.add_column_if_missing('notifications', 'read_at', 'timestamptz');
select public.add_column_if_missing('notifications', 'created_at', 'timestamptz', 'now()');

-- ============================================================
-- 7. MARKET_PRICE_HISTORY TABLE
-- ============================================================
select public.add_column_if_missing('market_price_history', 'market_id', 'text');
select public.add_column_if_missing('market_price_history', 'yes_price', 'numeric');
select public.add_column_if_missing('market_price_history', 'no_price', 'numeric');
select public.add_column_if_missing('market_price_history', 'yes_pool_smallest_unit', 'bigint');
select public.add_column_if_missing('market_price_history', 'no_pool_smallest_unit', 'bigint');
select public.add_column_if_missing('market_price_history', 'volume_smallest_unit', 'bigint');
select public.add_column_if_missing('market_price_history', 'trade_count', 'integer');
select public.add_column_if_missing('market_price_history', 'side', 'text');
select public.add_column_if_missing('market_price_history', 'amount_smallest_unit', 'bigint');
select public.add_column_if_missing('market_price_history', 'created_at', 'timestamptz', 'now()');

-- ============================================================
-- 8. DEPOSIT_REQUESTS TABLE
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

comment on table public.deposit_requests is 'User deposit requests pending admin review';

create index if not exists idx_deposit_requests_status on public.deposit_requests(status);
create index if not exists idx_deposit_requests_user_id on public.deposit_requests(user_id);
create index if not exists idx_deposit_requests_created_at on public.deposit_requests(created_at desc);

-- ============================================================
-- 9. WITHDRAWAL_REQUESTS TABLE
-- ============================================================
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

comment on table public.withdrawal_requests is 'User withdrawal requests pending admin review';

create index if not exists idx_withdrawal_requests_status on public.withdrawal_requests(status);
create index if not exists idx_withdrawal_requests_user_id on public.withdrawal_requests(user_id);
create index if not exists idx_withdrawal_requests_created_at on public.withdrawal_requests(created_at desc);

-- ============================================================
-- 10. MARKET_COMMENTS TABLE
-- ============================================================
create table if not exists public.market_comments (
  id          uuid primary key default gen_random_uuid(),
  market_id   text not null references public.markets(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null,
  like_count  integer default 0,
  created_at  timestamptz default now()
);

comment on table public.market_comments is 'User comments on markets';

create index if not exists idx_market_comments_market_id on public.market_comments(market_id);
create index if not exists idx_market_comments_user_id on public.market_comments(user_id);

-- ============================================================
-- 11. MARKET_TRADES TABLE
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

comment on table public.market_trades is 'Trade execution history per market';

create index if not exists idx_market_trades_market_id on public.market_trades(market_id);
create index if not exists idx_market_trades_user_id on public.market_trades(user_id);
create index if not exists idx_market_trades_created_at on public.market_trades(created_at desc);

-- ============================================================
-- 12. MARKET_ACTIVITY_EVENTS TABLE
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

comment on table public.market_activity_events is 'Activity feed events for market detail views';

create index if not exists idx_market_activity_market_id on public.market_activity_events(market_id);
create index if not exists idx_market_activity_created_at on public.market_activity_events(created_at desc);

-- ============================================================
-- 13. MARKET_RESOLUTION_LOGS TABLE
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

comment on table public.market_resolution_logs is 'Audit trail for market resolutions';

create index if not exists idx_resolution_logs_market_id on public.market_resolution_logs(market_id);

-- ============================================================
-- 14. SAVED_BANK_DETAILS TABLE
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

comment on table public.saved_bank_details is 'User saved bank account details for withdrawals';

create index if not exists idx_saved_bank_details_user_id on public.saved_bank_details(user_id);

-- ============================================================
-- 15. ADMIN_AUDIT_LOG TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_audit_log') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_audit_log' AND column_name='actor_email'
    ) THEN
      DROP POLICY IF EXISTS "audit_log: authenticated read" ON public.admin_audit_log;
      DROP TABLE public.admin_audit_log;
    END IF;
  END IF;
END $$;

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

comment on table public.admin_audit_log is 'Audit trail for all admin actions';

create index if not exists idx_audit_log_action on public.admin_audit_log(action);
create index if not exists idx_audit_log_actor_id on public.admin_audit_log(actor_id);
create index if not exists idx_audit_log_created_at on public.admin_audit_log(created_at desc);

-- ============================================================
-- 16. PROFILES TABLE
-- ============================================================
select public.add_column_if_missing('profiles', 'display_name', 'text');
select public.add_column_if_missing('profiles', 'avatar_url', 'text');
select public.add_column_if_missing('profiles', 'profile_image_url', 'text');
select public.add_column_if_missing('profiles', 'balance', 'numeric', '0');

-- ============================================================
-- RLS POLICIES
-- ============================================================

alter table public.withdrawal_requests enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "withdrawal_requests: own read" ON public.withdrawal_requests;
  DROP POLICY IF EXISTS "withdrawal_requests: own insert" ON public.withdrawal_requests;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "withdrawal_requests: own read"
  on public.withdrawal_requests for select
  using (auth.uid() = user_id);
create policy "withdrawal_requests: own insert"
  on public.withdrawal_requests for insert
  with check (auth.uid() = user_id);

alter table public.deposit_requests enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "deposit_requests: own read" ON public.deposit_requests;
  DROP POLICY IF EXISTS "deposit_requests: own insert" ON public.deposit_requests;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "deposit_requests: own read"
  on public.deposit_requests for select
  using (auth.uid() = user_id);
create policy "deposit_requests: own insert"
  on public.deposit_requests for insert
  with check (auth.uid() = user_id);

alter table public.market_comments enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "market_comments: public read" ON public.market_comments;
  DROP POLICY IF EXISTS "market_comments: own insert" ON public.market_comments;
  DROP POLICY IF EXISTS "market_comments: own delete" ON public.market_comments;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "market_comments: public read"
  on public.market_comments for select
  using (true);
create policy "market_comments: own insert"
  on public.market_comments for insert
  with check (auth.uid() = user_id);
create policy "market_comments: own delete"
  on public.market_comments for delete
  using (auth.uid() = user_id);

alter table public.market_trades enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "market_trades: public read" ON public.market_trades;
  DROP POLICY IF EXISTS "market_trades: own insert" ON public.market_trades;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "market_trades: public read"
  on public.market_trades for select
  using (true);
create policy "market_trades: own insert"
  on public.market_trades for insert
  with check (auth.uid() = user_id);

alter table public.market_activity_events enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "market_activity_events: public read" ON public.market_activity_events;
  DROP POLICY IF EXISTS "market_activity_events: own insert" ON public.market_activity_events;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "market_activity_events: public read"
  on public.market_activity_events for select
  using (true);
create policy "market_activity_events: own insert"
  on public.market_activity_events for insert
  with check (auth.uid() = user_id);

alter table public.market_resolution_logs enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "market_resolution_logs: public read" ON public.market_resolution_logs;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "market_resolution_logs: public read"
  on public.market_resolution_logs for select
  using (true);

alter table public.saved_bank_details enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "saved_bank_details: own read" ON public.saved_bank_details;
  DROP POLICY IF EXISTS "saved_bank_details: own upsert" ON public.saved_bank_details;
  DROP POLICY IF EXISTS "saved_bank_details: own update" ON public.saved_bank_details;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "saved_bank_details: own read"
  on public.saved_bank_details for select
  using (auth.uid() = user_id);
create policy "saved_bank_details: own insert"
  on public.saved_bank_details for insert
  with check (auth.uid() = user_id);
create policy "saved_bank_details: own update"
  on public.saved_bank_details for update
  using (auth.uid() = user_id);

alter table public.admin_audit_log enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "audit_log: authenticated read" ON public.admin_audit_log;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "audit_log: authenticated read"
  on public.admin_audit_log for select
  using (auth.role() = 'authenticated');

alter table public.market_price_history enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "market_price_history: public read" ON public.market_price_history;
  DROP POLICY IF EXISTS "market_price_history: service insert" ON public.market_price_history;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "market_price_history: public read"
  on public.market_price_history for select
  using (true);
create policy "market_price_history: service insert"
  on public.market_price_history for insert
  with check (true);

alter table public.notifications enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "notifications: own read" ON public.notifications;
  DROP POLICY IF EXISTS "notifications: own update" ON public.notifications;
  DROP POLICY IF EXISTS "notifications: service insert" ON public.notifications;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "notifications: own read"
  on public.notifications for select
  using (auth.uid() = user_id);
create policy "notifications: own update"
  on public.notifications for update
  using (auth.uid() = user_id);
create policy "notifications: service insert"
  on public.notifications for insert
  with check (true);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_positions_market_id on public.positions(market_id);
create index if not exists idx_positions_user_id on public.positions(user_id);
create index if not exists idx_positions_status on public.positions(status);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_type on public.transactions(type);
create index if not exists idx_transactions_status on public.transactions(status);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_wallets_user_id on public.wallets(user_id);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_username on public.users(username);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_account_status on public.users(account_status);
create index if not exists idx_markets_status on public.markets(status);
create index if not exists idx_markets_state on public.markets(state);
create index if not exists idx_markets_category on public.markets(category);
create index if not exists idx_markets_closes_at on public.markets(closes_at);
create index if not exists idx_markets_activation_state on public.markets(activation_state);
create index if not exists idx_markets_created_at on public.markets(created_at desc);
