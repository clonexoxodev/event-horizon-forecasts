-- ============================================================
-- Flippe · Admin Panel Support Migration
-- Created: 2026-07-20
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. withdrawal_requests table
-- ============================================================
create table if not exists public.withdrawal_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  amount          bigint not null,
  currency        text not null default 'NGN',
  reference       text unique not null,
  bank_name       text,
  account_number  text,
  account_name    text,
  review_tier     text default 'standard',
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed', 'failed')),
  rejection_reason text,
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

comment on table public.withdrawal_requests is 'User withdrawal requests pending admin review';

create index if not exists idx_withdrawal_requests_status on public.withdrawal_requests(status);
create index if not exists idx_withdrawal_requests_user_id on public.withdrawal_requests(user_id);
create index if not exists idx_withdrawal_requests_created_at on public.withdrawal_requests(created_at desc);

-- ============================================================
-- 2. admin_audit_log table
-- ============================================================
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
-- 3. Ensure users table has all needed columns
-- ============================================================
do $$
begin
  -- Add name column if missing
  if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'name') then
    alter table public.users add column name text;
  end if;

  -- Add account_status if missing
  if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'account_status') then
    alter table public.users add column account_status text default 'active' check (account_status in ('active', 'suspended', 'closed'));
  end if;

  -- Add suspended_at if missing
  if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'suspended_at') then
    alter table public.users add column suspended_at timestamptz;
  end if;

  -- Add suspended_by if missing
  if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'suspended_by') then
    alter table public.users add column suspended_by uuid references auth.users(id);
  end if;

  -- Add suspension_reason if missing
  if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'suspension_reason') then
    alter table public.users add column suspension_reason text;
  end if;
exception when others then
  -- users table may not exist (profiles used instead), skip silently
  null;
end $$;

-- ============================================================
-- 4. RPC: Admin approve withdrawal
-- ============================================================
create or replace function public.admin_approve_withdrawal(
  p_withdrawal_id uuid,
  p_admin_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_wallet record;
begin
  -- Get the withdrawal request
  select * into v_request
  from public.withdrawal_requests
  where id = p_withdrawal_id and status = 'pending';

  if v_request is null then
    return jsonb_build_object('success', false, 'error', 'Withdrawal request not found or already processed');
  end if;

  -- Lock the user's wallet
  select * into v_wallet
  from public.wallets
  where user_id = v_request.user_id
  for update;

  if v_wallet is null then
    return jsonb_build_object('success', false, 'error', 'User wallet not found');
  end if;

  if v_wallet.locked_ngn_kobo < v_request.amount then
    return jsonb_build_object('success', false, 'error', 'Insufficient locked funds');
  end if;

  -- Deduct from locked balance
  update public.wallets
  set locked_ngn_kobo = locked_ngn_kobo - v_request.amount,
      updated_at = now()
  where user_id = v_request.user_id;

  -- Update withdrawal status
  update public.withdrawal_requests
  set status = 'approved',
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      updated_at = now()
  where id = p_withdrawal_id;

  -- Create transaction record
  insert into public.transactions (
    user_id, type, amount, amount_smallest_unit, currency, direction,
    status, reference, reference_id, reference_type, metadata
  ) values (
    v_request.user_id, 'withdrawal', v_request.amount / 100.0, v_request.amount, v_request.currency, 'OUT',
    'completed', v_request.reference, p_withdrawal_id, 'withdrawal_request',
    jsonb_build_object('admin_id', p_admin_id, 'bank_name', v_request.bank_name, 'account_number', v_request.account_number)
  );

  -- Log audit entry
  insert into public.admin_audit_log (
    action, actor_id, target_type, target_id, target_label, details
  ) values (
    'withdrawal_approved', p_admin_id, 'withdrawal', p_withdrawal_id::text,
    v_request.amount / 100.0 || ' NGN',
    jsonb_build_object('user_id', v_request.user_id, 'amount', v_request.amount, 'bank_name', v_request.bank_name)
  );

  return jsonb_build_object('success', true, 'message', 'Withdrawal approved');
end;
$$;

-- ============================================================
-- 5. RPC: Admin reject withdrawal
-- ============================================================
create or replace function public.admin_reject_withdrawal(
  p_withdrawal_id uuid,
  p_admin_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
begin
  select * into v_request
  from public.withdrawal_requests
  where id = p_withdrawal_id and status = 'pending';

  if v_request is null then
    return jsonb_build_object('success', false, 'error', 'Withdrawal request not found or already processed');
  end if;

  -- Unlock the funds
  update public.wallets
  set available_ngn_kobo = available_ngn_kobo + v_request.amount,
      locked_ngn_kobo = locked_ngn_kobo - v_request.amount,
      updated_at = now()
  where user_id = v_request.user_id;

  -- Update withdrawal status
  update public.withdrawal_requests
  set status = 'rejected',
      rejection_reason = p_reason,
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      updated_at = now()
  where id = p_withdrawal_id;

  -- Create transaction record
  insert into public.transactions (
    user_id, type, amount, amount_smallest_unit, currency, direction,
    status, reference, reference_id, reference_type, metadata
  ) values (
    v_request.user_id, 'withdrawal', v_request.amount / 100.0, v_request.amount, v_request.currency, 'RELEASE',
    'rejected', v_request.reference, p_withdrawal_id, 'withdrawal_request',
    jsonb_build_object('admin_id', p_admin_id, 'reason', p_reason)
  );

  -- Log audit entry
  insert into public.admin_audit_log (
    action, actor_id, target_type, target_id, target_label, details
  ) values (
    'withdrawal_rejected', p_admin_id, 'withdrawal', p_withdrawal_id::text,
    v_request.amount / 100.0 || ' NGN',
    jsonb_build_object('user_id', v_request.user_id, 'reason', p_reason)
  );

  return jsonb_build_object('success', true, 'message', 'Withdrawal rejected');
end;
$$;

-- ============================================================
-- 6. RPC: Admin suspend user
-- ============================================================
create or replace function public.admin_suspend_user(
  p_user_id uuid,
  p_admin_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set account_status = 'suspended',
      suspended_at = now(),
      suspended_by = p_admin_id,
      suspension_reason = p_reason
  where id = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;

  -- Log audit entry
  insert into public.admin_audit_log (
    action, actor_id, target_type, target_id, target_label, details
  ) values (
    'user_suspended', p_admin_id, 'user', p_user_id::text, null,
    jsonb_build_object('reason', p_reason)
  );

  return jsonb_build_object('success', true, 'message', 'User suspended');
end;
$$;

-- ============================================================
-- 7. RPC: Admin activate user
-- ============================================================
create or replace function public.admin_activate_user(
  p_user_id uuid,
  p_admin_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set account_status = 'active',
      suspended_at = null,
      suspended_by = null,
      suspension_reason = null
  where id = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;

  -- Log audit entry
  insert into public.admin_audit_log (
    action, actor_id, target_type, target_id, target_label, details
  ) values (
    'user_activated', p_admin_id, 'user', p_user_id::text, null,
    null
  );

  return jsonb_build_object('success', true, 'message', 'User activated');
end;
$$;

-- ============================================================
-- 8. RPC: Admin refund market
-- ============================================================
create or replace function public.admin_refund_market(
  p_market_id text,
  p_admin_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market record;
  v_position record;
  v_refunded_count integer := 0;
  v_total_refunded numeric := 0;
begin
  select * into v_market from public.markets where id = p_market_id;

  if v_market is null then
    return jsonb_build_object('success', false, 'error', 'Market not found');
  end if;

  -- Refund all unresolved positions
  for v_position in
    select * from public.positions
    where market_id = p_market_id and outcome is null
  loop
    -- Refund to wallet
    update public.wallets
    set balance_ngn_kobo = balance_ngn_kobo + (v_position.stake * 100),
        available_ngn_kobo = available_ngn_kobo + (v_position.stake * 100),
        updated_at = now()
    where user_id = v_position.user_id;

    -- Mark position as refunded
    update public.positions
    set outcome = 'REFUNDED', payout = v_position.stake
    where id = v_position.id;

    -- Create refund transaction
    insert into public.transactions (
      user_id, type, amount, amount_smallest_unit, currency, direction,
      status, reference, reference_id, reference_type, metadata
    ) values (
      v_position.user_id, 'refund', v_position.stake, round(v_position.stake * 100)::bigint, 'NGN', 'IN',
      'completed', 'refund-' || p_market_id || '-' || v_position.id, v_position.id, 'position',
      jsonb_build_object('market_id', p_market_id, 'reason', p_reason)
    );

    v_refunded_count := v_refunded_count + 1;
    v_total_refunded := v_total_refunded + v_position.stake;
  end loop;

  -- Update market status
  update public.markets
  set resolved = true, outcome = 'REFUNDED'
  where id = p_market_id;

  -- Log audit entry
  insert into public.admin_audit_log (
    action, actor_id, target_type, target_id, target_label, details
  ) values (
    'market_refunded', p_admin_id, 'market', p_market_id, v_market.question,
    jsonb_build_object('positions_refunded', v_refunded_count, 'total_refunded', v_total_refunded, 'reason', p_reason)
  );

  return jsonb_build_object(
    'success', true,
    'message', 'Market refunded',
    'positions_refunded', v_refunded_count,
    'total_refunded', v_total_refunded
  );
end;
$$;

-- ============================================================
-- 9. RLS policies for new tables (service-role only via backend)
-- ============================================================
alter table public.withdrawal_requests enable row level security;
alter table public.admin_audit_log enable row level security;

-- Withdrawal requests: users can read their own
create policy "withdrawal_requests: own read"
  on public.withdrawal_requests for select
  using (auth.uid() = user_id);

-- Withdrawal requests: users can insert their own
create policy "withdrawal_requests: own insert"
  on public.withdrawal_requests for insert
  with check (auth.uid() = user_id);

-- Admin audit log: admins can read (enforced at app level, not RLS)
create policy "audit_log: authenticated read"
  on public.admin_audit_log for select
  using (auth.role() = 'authenticated');
