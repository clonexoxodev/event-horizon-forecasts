-- ============================================================================
-- FLIPPE → EVENT HORIZON — CONSOLIDATED REMEDIATION MIGRATION
-- Version: 1.0
-- Date: 2026-09-06
--
-- Guarantees every database object the DEPLOYED backend (api/index.ts on
-- Vercel) references actually exists with the correct shape:
--
--   1. Core tables exist (users, wallets, markets, positions, transactions,
--      notifications) even if only this file runs on a fresh database.
--   2. All backend-referenced columns exist on those tables (pool engine,
--      protected-market activation, settlement, review lifecycle).
--   3. CHECK constraints match every value the backend writes — the markets
--      status enum, pricing_model, settlement_status, activation_state,
--      payout_status, transaction type/direction/status, notification type,
--      position statuses, users role/account_status.
--   4. resolution_after_close (resolution_date > close_date) and
--      close_date_future (close_date > created_at) are preserved. The
--      backend now guarantees the invariant server-side.
--   5. All atomic wallet RPCs used by api/index.ts exist:
--      atomic_credit_deposit / atomic_reserve_for_withdrawal /
--      atomic_approve_withdrawal / atomic_reject_withdrawal /
--      atomic_decrement_available / atomic_refund_to_available /
--      atomic_unlock_from_order / atomic_settlement_payout /
--      atomic_settlement_loss / acquire_settlement_lock /
--      release_settlement_lock / cleanup_stale_settlement_locks.
--   6. Obsolete order-book tables and vestigial columns are dropped
--      idempotently (the pool engine is the only market model).
--   7. Storage buckets and RLS/Grants match the service-role serverless
--      architecture (RLS disabled on app tables; API enforces auth).
--   8. Indexes the backend depends on for query performance/discovery.
--
-- SAFE TO RUN MULTIPLE TIMES — every statement is idempotent.
-- Execute in Supabase SQL Editor. One shot.
-- ============================================================================

-- ============================================================================
-- SECTION 0: HELPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION add_column_if_missing(
  p_table text,
  p_column text,
  p_type text,
  p_default text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table
      AND column_name = p_column
  ) THEN
    IF p_default IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s DEFAULT %s', p_table, p_column, p_type, p_default);
    ELSE
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', p_table, p_column, p_type);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION drop_constraint_if_exists(p_table text, p_constraint text)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = format('public.%I', p_table)::regclass
      AND conname = p_constraint
  ) THEN
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', p_table, p_constraint);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop every constraint on a table matching one of the given names.
CREATE OR REPLACE FUNCTION drop_constraints_by_name(p_table text, VARIADIC p_names text[])
RETURNS void AS $$
DECLARE
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY p_names LOOP
    PERFORM drop_constraint_if_exists(p_table, v_name);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 1: CORE TABLES (guaranteed existence)
-- ============================================================================

ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS markets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  profile_picture_url VARCHAR(500),
  instagram_handle VARCHAR(100),
  twitter_handle VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance_ngn_kobo BIGINT NOT NULL DEFAULT 0,
  balance_usd_cents BIGINT NOT NULL DEFAULT 0,
  available_ngn_kobo BIGINT NOT NULL DEFAULT 0,
  available_usd_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT balance_non_negative CHECK (balance_ngn_kobo >= 0 AND balance_usd_cents >= 0),
  CONSTRAINT available_non_negative CHECK (available_ngn_kobo >= 0 AND available_usd_cents >= 0)
);

-- NOTE: available_lte_balance is intentionally NOT re-created. It breaks the
-- atomic wallet functions (available → locked moves violate it mid-update).
-- wallet/available budgets cannot go negative) are enforced inside each RPC.
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS available_lte_balance;

CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  description TEXT,
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD')),
  pool_amount_smallest_unit BIGINT NOT NULL DEFAULT 0,
  yes_pool_smallest_unit BIGINT NOT NULL DEFAULT 0,
  no_pool_smallest_unit BIGINT NOT NULL DEFAULT 0,
  min_position_smallest_unit BIGINT NOT NULL DEFAULT 100,
  max_position_smallest_unit BIGINT,
  state VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'closed', 'resolved')),
  winning_side VARCHAR(3) CHECK (winning_side IN ('YES', 'NO')),
  closes_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  side VARCHAR(3) NOT NULL CHECK (side IN ('YES', 'NO')),
  amount_smallest_unit BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD')),
  potential_return_smallest_unit BIGINT NOT NULL DEFAULT 0,
  entry_price INTEGER CHECK (entry_price >= 0 AND entry_price <= 100),
  is_winner BOOLEAN,
  payout_smallest_unit BIGINT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ,
  CONSTRAINT amount_positive CHECK (amount_smallest_unit > 0)
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  amount_smallest_unit BIGINT NOT NULL CHECK (amount_smallest_unit > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD')),
  direction VARCHAR(8) NOT NULL,
  reference_id UUID,
  reference_type VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID,
  reference_type VARCHAR(30),
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 2: MARKETS COLUMNS (all backend-referenced)
-- ============================================================================

SELECT add_column_if_missing('markets', 'status', 'text', $$'active'$$);
SELECT add_column_if_missing('markets', 'category', 'text', $$'General'$$);
SELECT add_column_if_missing('markets', 'country_filter', 'varchar(2)');
SELECT add_column_if_missing('markets', 'market_type', 'text', $$'binary'$$);
SELECT add_column_if_missing('markets', 'yes_label', 'text', $$'YES'$$);
SELECT add_column_if_missing('markets', 'no_label', 'text', $$'NO'$$);
SELECT add_column_if_missing('markets', 'yes_price', 'numeric', '50');
SELECT add_column_if_missing('markets', 'no_price', 'numeric', '50');
SELECT add_column_if_missing('markets', 'close_date', 'timestamptz');
SELECT add_column_if_missing('markets', 'resolution_date', 'timestamptz');
SELECT add_column_if_missing('markets', 'resolution_source', 'text');
SELECT add_column_if_missing('markets', 'resolution_instructions', 'text');
SELECT add_column_if_missing('markets', 'outcome', 'varchar(10)');
SELECT add_column_if_missing('markets', 'image_url', 'text');
SELECT add_column_if_missing('markets', 'video_url', 'text');
SELECT add_column_if_missing('markets', 'is_trending', 'boolean', 'false');
SELECT add_column_if_missing('markets', 'created_by', 'uuid');
SELECT add_column_if_missing('markets', 'participant_count', 'integer', '0');
SELECT add_column_if_missing('markets', 'version', 'integer', '1');
SELECT add_column_if_missing('markets', 'archived_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'pricing_model', 'text', $$'ownership_shares'$$);
SELECT add_column_if_missing('markets', 'starting_yes_price', 'numeric');
SELECT add_column_if_missing('markets', 'starting_no_price', 'numeric');
SELECT add_column_if_missing('markets', 'yes_volume_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'no_volume_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'total_yes_shares', 'numeric', '0');
SELECT add_column_if_missing('markets', 'total_no_shares', 'numeric', '0');
SELECT add_column_if_missing('markets', 'settlement_pool_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'platform_fee_bps', 'integer', '0');
SELECT add_column_if_missing('markets', 'creator_reward_bps', 'integer', '0');
SELECT add_column_if_missing('markets', 'trade_count', 'integer', '0');
SELECT add_column_if_missing('markets', 'total_volume_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'seed_liquidity_yes_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'seed_liquidity_no_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'trading_close_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'visibility', 'text', $$'public'$$);
SELECT add_column_if_missing('markets', 'invite_code', 'text');
SELECT add_column_if_missing('markets', 'participant_limit', 'integer');
SELECT add_column_if_missing('markets', 'submitted_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'reviewed_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'approved_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'rejected_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'rejection_reason', 'text');
SELECT add_column_if_missing('markets', 'base_score', 'numeric', '0');
SELECT add_column_if_missing('markets', 'activated_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'activation_snapshot', 'jsonb', $$'{}'::jsonb$$);
SELECT add_column_if_missing('markets', 'protected_market_enabled', 'boolean', 'true');
SELECT add_column_if_missing('markets', 'activation_state', 'text', $$'protected'$$);
SELECT add_column_if_missing('markets', 'activation_threshold_smallest_unit', 'bigint', '1000000');
SELECT add_column_if_missing('markets', 'activation_yes_min_smallest_unit', 'bigint', '200000');
SELECT add_column_if_missing('markets', 'activation_no_min_smallest_unit', 'bigint', '200000');
SELECT add_column_if_missing('markets', 'activation_min_participants', 'integer', '5');
SELECT add_column_if_missing('markets', 'protected_max_stake_smallest_unit', 'bigint', '100000');
SELECT add_column_if_missing('markets', 'settlement_status', 'text', $$'idle'$$);
SELECT add_column_if_missing('markets', 'settlement_started_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'settlement_completed_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'settlement_error', 'text');
SELECT add_column_if_missing('markets', 'settlement_log', 'jsonb', $$'[]'::jsonb$$);
SELECT add_column_if_missing('markets', 'total_settled_positions', 'integer', '0');
SELECT add_column_if_missing('markets', 'total_settled_payout_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'total_refunded_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'settlement_lock_owner', 'uuid');
SELECT add_column_if_missing('markets', 'settlement_lock_acquired_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'settlement_lock_expires_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'resolved_outcome', 'text');
SELECT add_column_if_missing('markets', 'winning_outcome', 'text');
SELECT add_column_if_missing('markets', 'resolved_by', 'uuid');
SELECT add_column_if_missing('markets', 'refunded_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'refund_reason', 'text');
SELECT add_column_if_missing('markets', 'refund_status', 'text');
SELECT add_column_if_missing('markets', 'refunded_by', 'uuid');
SELECT add_column_if_missing('markets', 'activated_by', 'uuid');
SELECT add_column_if_missing('markets', 'cancelled_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'cancel_reason', 'text');
SELECT add_column_if_missing('markets', 'payout_status', 'text', $$'not_applicable'$$);
SELECT add_column_if_missing('markets', 'payout_completed_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'rules', 'text');

-- Backfill close/resolution dates for legacy rows created before the columns existed.
-- resolution_date is guaranteed strictly after close_date (matches the backend's
-- ensureResolutionAfterClose, using a 2-minute margin) so that adding the
-- resolution_after_close constraint below can never fail on legacy data.
UPDATE markets SET close_date = COALESCE(close_date, closes_at) WHERE close_date IS NULL;
UPDATE markets SET closes_at = COALESCE(closes_at, close_date) WHERE closes_at IS NULL;
UPDATE markets SET
  resolution_date = (COALESCE(close_date, closes_at)) + interval '2 minutes'
WHERE (resolution_date IS NULL OR resolution_date <= COALESCE(close_date, closes_at))
  AND COALESCE(close_date, closes_at) IS NOT NULL;
UPDATE markets SET status = COALESCE(status, 'active') WHERE status IS NULL;
UPDATE markets SET pricing_model = COALESCE(pricing_model, 'ownership_shares') WHERE pricing_model IS NULL;
UPDATE markets SET yes_price = COALESCE(yes_price, 50) WHERE yes_price IS NULL;
UPDATE markets SET no_price = COALESCE(no_price, 50) WHERE no_price IS NULL;
UPDATE markets SET category = COALESCE(category, 'General') WHERE category IS NULL;

-- Catch any remaining NULL resolution_date rows (e.g., legacy rows with no
-- close_at/close_date) so that SET NOT NULL below cannot fail.
UPDATE markets SET resolution_date = created_at + interval '1 day' WHERE resolution_date IS NULL;

ALTER TABLE markets ALTER COLUMN close_date SET NOT NULL;
ALTER TABLE markets ALTER COLUMN resolution_date SET NOT NULL;
ALTER TABLE markets ALTER COLUMN status SET NOT NULL;
ALTER TABLE markets ALTER COLUMN category SET NOT NULL;
ALTER TABLE markets ALTER COLUMN yes_price SET NOT NULL;
ALTER TABLE markets ALTER COLUMN no_price SET NOT NULL;

-- ============================================================================
-- SECTION 3: POSITIONS COLUMNS (all backend-referenced)
-- ============================================================================

SELECT add_column_if_missing('positions', 'status', 'text', $$'active'$$);
SELECT add_column_if_missing('positions', 'settled_at', 'timestamptz');
SELECT add_column_if_missing('positions', 'settlement_id', 'text');
SELECT add_column_if_missing('positions', 'settlement_outcome', 'text');
SELECT add_column_if_missing('positions', 'refund_reason', 'text');
SELECT add_column_if_missing('positions', 'refund_amount_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('positions', 'refunded_at', 'timestamptz');
SELECT add_column_if_missing('positions', 'profit_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('positions', 'final_payout_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('positions', 'winning_outcome', 'text');
SELECT add_column_if_missing('positions', 'shares_owned', 'bigint', '0');
SELECT add_column_if_missing('positions', 'shares_received', 'bigint', '0');
SELECT add_column_if_missing('positions', 'price_at_purchase', 'bigint');
SELECT add_column_if_missing('positions', 'stake_amount', 'bigint', '0');
SELECT add_column_if_missing('positions', 'entry_yes_price', 'numeric');
SELECT add_column_if_missing('positions', 'entry_no_price', 'numeric');
SELECT add_column_if_missing('positions', 'estimated_payout_at_purchase', 'numeric');
SELECT add_column_if_missing('positions', 'estimated_profit_at_purchase', 'numeric');
SELECT add_column_if_missing('positions', 'estimated_payout_smallest_unit', 'bigint');
SELECT add_column_if_missing('positions', 'estimated_profit_smallest_unit', 'bigint');
SELECT add_column_if_missing('positions', 'projected_payout_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('positions', 'projected_profit_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('positions', 'last_valued_at', 'timestamptz');
SELECT add_column_if_missing('positions', 'current_price', 'numeric');
SELECT add_column_if_missing('positions', 'current_value_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('positions', 'ownership_percent', 'numeric', '0');
SELECT add_column_if_missing('positions', 'settlement_payout_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('positions', 'settlement_profit_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('positions', 'market_question_snapshot', 'text');
SELECT add_column_if_missing('positions', 'market_category_snapshot', 'text');
SELECT add_column_if_missing('positions', 'idempotency_key', 'text');

UPDATE positions SET status = COALESCE(status, 'active') WHERE status IS NULL;

-- ============================================================================
-- SECTION 4: TRANSACTIONS / NOTIFICATIONS / USERS / WALLETS COLUMNS
-- ============================================================================

SELECT add_column_if_missing('transactions', 'market_id', 'uuid');
SELECT add_column_if_missing('transactions', 'position_id', 'uuid');
SELECT add_column_if_missing('transactions', 'reference', 'text');
SELECT add_column_if_missing('transactions', 'description', 'text');
SELECT add_column_if_missing('transactions', 'approved_by', 'uuid');
SELECT add_column_if_missing('transactions', 'approved_at', 'timestamptz');

SELECT add_column_if_missing('notifications', 'read_at', 'timestamptz');

SELECT add_column_if_missing('users', 'name', 'text');
SELECT add_column_if_missing('users', 'avatar_url', 'text');
SELECT add_column_if_missing('users', 'profile_image_url', 'text');
SELECT add_column_if_missing('users', 'account_status', 'text', $$'active'$$);
SELECT add_column_if_missing('users', 'suspended_at', 'timestamptz');
SELECT add_column_if_missing('users', 'suspended_by', 'uuid');
SELECT add_column_if_missing('users', 'suspension_reason', 'text');
SELECT add_column_if_missing('users', 'last_login_at', 'timestamptz');
SELECT add_column_if_missing('users', 'last_active_at', 'timestamptz');

SELECT add_column_if_missing('wallets', 'locked_ngn_kobo', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'locked_usd_cents', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'total_deposited_ngn_kobo', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'total_withdrawn_ngn_kobo', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'total_winnings_ngn_kobo', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'total_winnings_usd_cents', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'total_staked_ngn_kobo', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'currency', 'text', $$'NGN'$$);

UPDATE users SET account_status = COALESCE(account_status, 'active') WHERE account_status IS NULL;
UPDATE users SET role = COALESCE(role, 'user') WHERE role IS NULL;

-- ============================================================================
-- SECTION 5: FINANCE / SUPPORT TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount_smallest_unit bigint NOT NULL CHECK (amount_smallest_unit > 0),
  currency text NOT NULL DEFAULT 'NGN',
  reference text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'manual',
  payment_instruction text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount_smallest_unit bigint NOT NULL CHECK (amount_smallest_unit > 0),
  currency text NOT NULL DEFAULT 'NGN',
  reference text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'manual',
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  review_tier text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  yes_price numeric NOT NULL CHECK (yes_price >= 0 AND yes_price <= 100),
  no_price numeric NOT NULL CHECK (no_price >= 0 AND no_price <= 100),
  yes_pool_smallest_unit bigint NOT NULL DEFAULT 0,
  no_pool_smallest_unit bigint NOT NULL DEFAULT 0,
  volume_smallest_unit bigint NOT NULL DEFAULT 0,
  trade_count integer NOT NULL DEFAULT 0,
  side text,
  amount_smallest_unit bigint NOT NULL DEFAULT 0,
  yes_volume_smallest_unit bigint NOT NULL DEFAULT 0,
  no_volume_smallest_unit bigint NOT NULL DEFAULT 0,
  total_yes_shares numeric NOT NULL DEFAULT 0,
  total_no_shares numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Extend market_price_history if an older variant created it with fewer columns.
SELECT add_column_if_missing('market_price_history', 'volume_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('market_price_history', 'trade_count', 'integer', '0');
SELECT add_column_if_missing('market_price_history', 'side', 'text');
SELECT add_column_if_missing('market_price_history', 'amount_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('market_price_history', 'yes_volume_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('market_price_history', 'no_volume_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('market_price_history', 'total_yes_shares', 'numeric', '0');
SELECT add_column_if_missing('market_price_history', 'total_no_shares', 'numeric', '0');

CREATE TABLE IF NOT EXISTS market_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('YES', 'NO')),
  amount_smallest_unit bigint NOT NULL CHECK (amount_smallest_unit > 0),
  price_before numeric NOT NULL,
  price_after numeric NOT NULL,
  yes_price_after numeric,
  no_price_after numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_resolution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  resolved_by uuid REFERENCES public.users(id),
  outcome text NOT NULL,
  winning_pool_smallest_unit bigint NOT NULL DEFAULT 0,
  losing_pool_smallest_unit bigint NOT NULL DEFAULT 0,
  payout_pool_smallest_unit bigint NOT NULL DEFAULT 0,
  resolved_position_count integer NOT NULL DEFAULT 0,
  payout_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  position_id uuid,
  event_type text NOT NULL,
  side text,
  amount_smallest_unit bigint,
  price numeric,
  shares numeric,
  position_value_smallest_unit bigint,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payout_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  position_id uuid,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_smallest_unit bigint NOT NULL CHECK (amount_smallest_unit > 0),
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending',
  payout_method text,
  reference text,
  processed_by uuid REFERENCES public.users(id),
  processed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispute_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  position_id uuid,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  resolved_by uuid REFERENCES public.users(id),
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_value_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_value_smallest_unit bigint NOT NULL DEFAULT 0,
  cash_value_smallest_unit bigint NOT NULL DEFAULT 0,
  position_value_smallest_unit bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  total_predictions integer NOT NULL DEFAULT 0,
  correct_predictions integer NOT NULL DEFAULT 0,
  accuracy_percentage numeric(5,2) NOT NULL DEFAULT 0.00,
  rank integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS position_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  listing_code varchar(8) UNIQUE NOT NULL,
  asking_price bigint NOT NULL,
  status varchar(20) NOT NULL CHECK (status IN ('active', 'sold', 'cancelled')),
  buyer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  sold_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Pool-engine support tables (from 20260904_mvp_pool_engine).
CREATE TABLE IF NOT EXISTS market_participants (
  market_id uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (market_id, user_id)
);

CREATE TABLE IF NOT EXISTS market_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  yes_pool_smallest_unit bigint NOT NULL DEFAULT 0,
  no_pool_smallest_unit bigint NOT NULL DEFAULT 0,
  total_pool_smallest_unit bigint NOT NULL DEFAULT 0,
  participants integer NOT NULL DEFAULT 0,
  sealed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_pools_market_uniq UNIQUE (market_id),
  CONSTRAINT market_pools_total_consistent CHECK (
    total_pool_smallest_unit = yes_pool_smallest_unit + no_pool_smallest_unit
  )
);

CREATE TABLE IF NOT EXISTS canonical_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  normalized_key text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT canonical_events_key_uniq UNIQUE (normalized_key)
);

CREATE TABLE IF NOT EXISTS market_events (
  market_id uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  canonical_event_id uuid NOT NULL REFERENCES canonical_events(id) ON DELETE CASCADE,
  is_original boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'flagged', 'approved', 'merged')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (market_id, canonical_event_id)
);

CREATE TABLE IF NOT EXISTS market_promoters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship text NOT NULL CHECK (relationship IN ('creator', 'promoter')),
  share_code text,
  reward_bps integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_promoters_uniq UNIQUE (market_id, user_id, relationship)
);

CREATE TABLE IF NOT EXISTS creator_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_smallest_unit bigint NOT NULL CHECK (amount_smallest_unit >= 0),
  currency text NOT NULL DEFAULT 'NGN',
  source text NOT NULL DEFAULT 'market_settlement' CHECK (source IN ('market_settlement', 'promotion')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'failed')),
  reference_id uuid,
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_uniq UNIQUE (name),
  CONSTRAINT categories_slug_uniq UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS market_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'needs_changes', 'flagged')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('create', 'update', 'status_change', 'delete')),
  changed_fields JSONB,
  snapshot_before JSONB,
  snapshot_after JSONB,
  ip_address INET,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS settlement_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  admin_user_id uuid REFERENCES public.users(id),
  action_type text NOT NULL,
  outcome text,
  position_id uuid,
  order_id uuid,
  fill_id uuid,
  trade_id uuid,
  user_id uuid,
  amount_smallest_unit bigint,
  payout_smallest_unit bigint,
  refund_amount_smallest_unit bigint,
  metadata jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_id uuid REFERENCES public.users(id),
  actor_email text,
  actor_role text,
  target_type text,
  target_id text,
  target_label text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Admin operations support tables (read/written by api/index.ts admin routes).
CREATE TABLE IF NOT EXISTS feature_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,
  label       text NOT NULL DEFAULT '',
  description text,
  enabled     boolean NOT NULL DEFAULT true,
  category    text NOT NULL DEFAULT 'general',
  created_by  uuid,
  updated_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL,
  title      text NOT NULL,
  message    text NOT NULL,
  severity   text NOT NULL DEFAULT 'info',
  metadata   jsonb DEFAULT '{}'::jsonb,
  read_by    uuid[] DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.users(id),
  alert_type   text NOT NULL,
  severity     text NOT NULL DEFAULT 'medium',
  title        text NOT NULL,
  description  text NOT NULL,
  evidence     jsonb DEFAULT '{}'::jsonb,
  status       text NOT NULL DEFAULT 'pending',
  reviewed_by  uuid REFERENCES public.users(id),
  review_notes text,
  reviewed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Settlement engine records (admin analytics / health only; written by the
-- settlement RPCs). Read via .eq('market_id'), .eq('status', ...).
CREATE TABLE IF NOT EXISTS settlements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id    uuid REFERENCES markets(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending',
  started_at   timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 5b: SUPPORTING TABLE COLUMN ENSURES
-- ============================================================================

-- platform_settings enhancements (from FLIPPE_SPRINT6_MIGRATION).
SELECT add_column_if_missing('platform_settings', 'category', 'text', $$'general'$$);
SELECT add_column_if_missing('platform_settings', 'updated_by', 'uuid');

-- admin_audit_log enhancements (from FLIPPE_SPRINT6_MIGRATION).
SELECT add_column_if_missing('admin_audit_log', 'ip_address', 'text');
SELECT add_column_if_missing('admin_audit_log', 'user_agent', 'text');
SELECT add_column_if_missing('admin_audit_log', 'old_value', 'jsonb');
SELECT add_column_if_missing('admin_audit_log', 'new_value', 'jsonb');
SELECT add_column_if_missing('admin_audit_log', 'reason', 'text');
SELECT add_column_if_missing('admin_audit_log', 'affected_user_id', 'uuid');
SELECT add_column_if_missing('admin_audit_log', 'affected_market_id', 'uuid');

-- ============================================================================
-- SECTION 6: CONSTRAINT RECONCILIATION
-- ============================================================================

ALTER TABLE markets DISABLE ROW LEVEL SECURITY;
ALTER TABLE positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_resolution_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_activity_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE saved_bank_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE payout_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_value_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE position_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_promoters DISABLE ROW LEVEL SECURITY;
ALTER TABLE creator_rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_audit_trail DISABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE settlements DISABLE ROW LEVEL SECURITY;

-- 6.1 Markets — status/state/pricing/settlement enums used by api/index.ts:
--     submitted (public user create), active, rejected, pending_resolution,
--     resolving, resolved, cancelled, archived, refunded, paused, draft, open.
DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'markets',
    'status_enum',
    'markets_status_check',
    'markets_status_v1_check',
    'markets_status_v2_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'markets_status_enums'
      AND conrelid = 'public.markets'::regclass
  ) THEN
    ALTER TABLE markets ADD CONSTRAINT markets_status_enums
      CHECK (status IN (
        'draft', 'submitted', 'active', 'rejected', 'closed', 'paused',
        'pending_resolution', 'resolving', 'resolved', 'cancelled',
        'archived', 'refunded', 'open'
      ));
  END IF;
END $$;

DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'markets',
    'markets_pricing_model_check',
    'markets_pricing_model_v2_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'markets_pricing_model_check'
      AND conrelid = 'public.markets'::regclass
  ) THEN
    ALTER TABLE markets ADD CONSTRAINT markets_pricing_model_check
      CHECK (pricing_model IN ('pool', 'orderbook', 'ownership_shares', 'legacy_fixed_share', 'legacy_pool'));
  END IF;
END $$;

DO $$
BEGIN
  PERFORM drop_constraints_by_name('markets', 'markets_settlement_status_check');

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'markets_settlement_status_check'
      AND conrelid = 'public.markets'::regclass
  ) THEN
    ALTER TABLE markets ADD CONSTRAINT markets_settlement_status_check
      CHECK (settlement_status IN ('idle', 'pending', 'settling', 'completed', 'failed', 'refunding', 'refunded', 'cancelled'));
  END IF;
END $$;

DO $$
BEGIN
  PERFORM drop_constraints_by_name('markets', 'markets_activation_state_check');

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'markets_activation_state_check'
      AND conrelid = 'public.markets'::regclass
  ) THEN
    ALTER TABLE markets ADD CONSTRAINT markets_activation_state_check
      CHECK (activation_state IN ('protected', 'building', 'live', 'resolved', 'refunded'));
  END IF;
END $$;

DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'markets',
    'markets_payout_status_v1_check',
    'markets_payout_status_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'markets_payout_status_v1_check'
      AND conrelid = 'public.markets'::regclass
  ) THEN
    ALTER TABLE markets ADD CONSTRAINT markets_payout_status_v1_check
      CHECK (payout_status IN ('not_applicable', 'pending', 'processing', 'completed', 'failed'));
  END IF;
END $$;

-- Date ordering invariants (THE constraint that was blocking market creation).
ALTER TABLE markets ADD CONSTRAINT IF NOT EXISTS resolution_after_close
  CHECK (resolution_date > close_date);

ALTER TABLE markets ADD CONSTRAINT IF NOT EXISTS close_date_future
  CHECK (close_date > created_at);

-- Price sanity (pool model uses integer percentages via y/n labels).
ALTER TABLE markets ADD CONSTRAINT IF NOT EXISTS price_sum_equals_100
  CHECK (yes_price + no_price = 100);

ALTER TABLE markets ADD CONSTRAINT IF NOT EXISTS price_range_yes
  CHECK (yes_price >= 0 AND yes_price <= 100);

ALTER TABLE markets ADD CONSTRAINT IF NOT EXISTS price_range_no
  CHECK (no_price >= 0 AND no_price <= 100);

ALTER TABLE markets ADD CONSTRAINT IF NOT EXISTS markets_visibility_check
  CHECK (visibility IN ('public', 'private'));

-- 6.2 Positions — status values written by the settlement/refund engine.
DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'positions',
    'positions_status_check',
    'positions_status_v1_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'positions_status_v1_check'
      AND conrelid = 'public.positions'::regclass
  ) THEN
    ALTER TABLE positions ADD CONSTRAINT positions_status_v1_check
      CHECK (status IN ('active', 'pending', 'won', 'lost', 'settled', 'refunded', 'sold', 'cancelled'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS positions_idempotency_uniq
  ON positions(market_id, user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 6.3 Transactions — every type/direction/status the backend writes.
DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'transactions',
    'transactions_type_check',
    'transactions_type_v1_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_type_v1_check'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_type_v1_check
      CHECK (type IN (
        'deposit', 'withdrawal', 'position_entry', 'position_payout', 'refund',
        'deposit_request', 'deposit_approved', 'deposit_rejected',
        'withdrawal_request', 'withdrawal_approved', 'withdrawal_rejected',
        'prediction_stake', 'market_payout', 'admin_adjustment'
      ));
  END IF;
END $$;

DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'transactions',
    'transactions_direction_check',
    'transactions_direction_v1_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_direction_v1_check'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_direction_v1_check
      CHECK (direction IN ('IN', 'OUT', 'HOLD', 'RELEASE'));
  END IF;
END $$;

DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'transactions',
    'transactions_status_check',
    'transactions_status_v1_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_status_v1_check'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_status_v1_check
      CHECK (status IN ('pending', 'completed', 'failed', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'transactions',
    'transactions_reference_type_check',
    'transactions_reference_type_v1_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_reference_type_v1_check'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_reference_type_v1_check
      CHECK (reference_type IS NULL OR reference_type IN (
        'position', 'deposit', 'withdrawal', 'deposit_request', 'withdrawal_request', 'market'
      ));
  END IF;
END $$;

-- 6.4 Notifications — every type the backend sends.
DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'notifications',
    'notifications_type_check',
    'notifications_type_v1_check',
    'valid_notification_type'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
      CHECK (type IN (
        'market_resolved', 'market_approved', 'market_rejected', 'deposit_confirmed', 'withdrawal_confirmed',
        'position_won', 'position_lost', 'position_sold',
        'forecast_confirmed', 'market_ended', 'market_payout',
        'new_market', 'wallet_low',
        'deposit_request_created', 'deposit_approved', 'deposit_rejected',
        'withdrawal_requested', 'withdrawal_approved', 'withdrawal_rejected',
        'system', 'settlement_won', 'settlement_lost',
        'order_refunded', 'refund',
        'order_filled', 'order_cancelled', 'order_expired'
      ));
  END IF;
END $$;

-- 6.5 Users — role + account_status (matches backend auth/suspension).
DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'users',
    'users_role_check',
    'users_role_v1_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_v1_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_v1_check
      CHECK (role IN ('user', 'admin', 'super_admin'));
  END IF;
END $$;

DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'users',
    'users_account_status_check',
    'users_account_status_v1_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_account_status_v1_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_account_status_v1_check
      CHECK (account_status IN ('active', 'suspended', 'closed'));
  END IF;
END $$;

-- 6.6 Withdrawal requests — statuses the admin finance flows use.
DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'withdrawal_requests',
    'withdrawal_requests_status_check',
    'withdrawal_requests_status_v1_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'withdrawal_requests_status_v1_check'
      AND conrelid = 'public.withdrawal_requests'::regclass
  ) THEN
    ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_status_v1_check
      CHECK (status IN ('pending', 'approved', 'denied', 'paid', 'completed', 'rejected', 'failed'));
  END IF;
END $$;

-- 6.7 Deposit requests — statuses the admin finance flows use.
DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'deposit_requests',
    'deposit_requests_status_check',
    'deposit_requests_status_v1_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deposit_requests_status_v1_check'
      AND conrelid = 'public.deposit_requests'::regclass
  ) THEN
    ALTER TABLE deposit_requests ADD CONSTRAINT deposit_requests_status_v1_check
      CHECK (status IN ('pending', 'completed', 'rejected', 'failed'));
  END IF;
END $$;

-- 6.8 Payout records — statuses.
DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'payout_records',
    'payout_records_status_check',
    'payout_records_status_v1_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payout_records_status_v1_check'
      AND conrelid = 'public.payout_records'::regclass
  ) THEN
    ALTER TABLE payout_records ADD CONSTRAINT payout_records_status_v1_check
      CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));
  END IF;
END $$;

-- 6.9 market_activity_events — event types.
DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'market_activity_events',
    'market_activity_events_type_check',
    'market_activity_events_type_v2_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'market_activity_events_type_v2_check'
      AND conrelid = 'public.market_activity_events'::regclass
  ) THEN
    ALTER TABLE market_activity_events ADD CONSTRAINT market_activity_events_type_v2_check
      CHECK (event_type IN (
        'bought_yes', 'bought_no', 'position_value_increase', 'position_value_decrease',
        'market_closed', 'market_resolved', 'ownership_changed',
        'settlement_payout', 'settlement_loss'
      ));
  END IF;
END $$;

-- 6.10 saved_bank_details — upsert targets ON CONFLICT (user_id).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'saved_bank_details_user_id_key'
      AND conrelid = 'public.saved_bank_details'::regclass
  ) THEN
    ALTER TABLE saved_bank_details ADD CONSTRAINT saved_bank_details_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- market_price_history price-total sanity.
ALTER TABLE market_price_history DROP CONSTRAINT IF EXISTS market_price_history_total;
ALTER TABLE market_price_history ADD CONSTRAINT IF NOT EXISTS market_price_history_total
  CHECK (yes_price + no_price = 100);

-- ============================================================================
-- SECTION 7: ATOMIC WALLET / FINANCE RPCs (used by api/index.ts)
-- ============================================================================

CREATE OR REPLACE FUNCTION atomic_credit_deposit(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid, user_id uuid,
  balance_ngn_kobo bigint, balance_usd_cents bigint,
  available_ngn_kobo bigint, available_usd_cents bigint,
  locked_ngn_kobo bigint, locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint, updated_at timestamptz
) AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets SET
      balance_usd_cents = balance_usd_cents + p_amount,
      available_usd_cents = available_usd_cents + p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.total_deposited_ngn_kobo, wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      balance_ngn_kobo = balance_ngn_kobo + p_amount,
      available_ngn_kobo = available_ngn_kobo + p_amount,
      total_deposited_ngn_kobo = total_deposited_ngn_kobo + p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.total_deposited_ngn_kobo, wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION atomic_reserve_for_withdrawal(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid, user_id uuid,
  balance_ngn_kobo bigint, balance_usd_cents bigint,
  available_ngn_kobo bigint, available_usd_cents bigint,
  locked_ngn_kobo bigint, locked_usd_cents bigint,
  updated_at timestamptz
) AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets SET
      available_usd_cents = available_usd_cents - p_amount,
      locked_usd_cents = locked_usd_cents + p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.available_usd_cents >= p_amount
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      available_ngn_kobo = available_ngn_kobo - p_amount,
      locked_ngn_kobo = locked_ngn_kobo + p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.available_ngn_kobo >= p_amount
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION atomic_approve_withdrawal(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid, user_id uuid,
  balance_ngn_kobo bigint, balance_usd_cents bigint,
  available_ngn_kobo bigint, available_usd_cents bigint,
  locked_ngn_kobo bigint, locked_usd_cents bigint,
  total_withdrawn_ngn_kobo bigint, updated_at timestamptz
) AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets SET
      balance_usd_cents = balance_usd_cents - p_amount,
      locked_usd_cents = locked_usd_cents - p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.locked_usd_cents >= p_amount
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.total_withdrawn_ngn_kobo, wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      balance_ngn_kobo = balance_ngn_kobo - p_amount,
      locked_ngn_kobo = locked_ngn_kobo - p_amount,
      total_withdrawn_ngn_kobo = total_withdrawn_ngn_kobo + p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.locked_ngn_kobo >= p_amount
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.total_withdrawn_ngn_kobo, wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION atomic_reject_withdrawal(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid, user_id uuid,
  balance_ngn_kobo bigint, balance_usd_cents bigint,
  available_ngn_kobo bigint, available_usd_cents bigint,
  locked_ngn_kobo bigint, locked_usd_cents bigint,
  updated_at timestamptz
) AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets SET
      locked_usd_cents = locked_usd_cents - p_amount,
      available_usd_cents = available_usd_cents + p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.locked_usd_cents >= p_amount
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      locked_ngn_kobo = locked_ngn_kobo - p_amount,
      available_ngn_kobo = available_ngn_kobo + p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.locked_ngn_kobo >= p_amount
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION atomic_decrement_available(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid, user_id uuid,
  balance_ngn_kobo bigint, balance_usd_cents bigint,
  available_ngn_kobo bigint, available_usd_cents bigint,
  locked_ngn_kobo bigint, locked_usd_cents bigint,
  updated_at timestamptz
) AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets SET
      available_usd_cents = available_usd_cents - p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.available_usd_cents >= p_amount
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      available_ngn_kobo = available_ngn_kobo - p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.available_ngn_kobo >= p_amount
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION atomic_refund_to_available(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid, user_id uuid,
  balance_ngn_kobo bigint, balance_usd_cents bigint,
  available_ngn_kobo bigint, available_usd_cents bigint,
  updated_at timestamptz
) AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets SET
      available_usd_cents = available_usd_cents + p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      available_ngn_kobo = available_ngn_kobo + p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION atomic_unlock_from_order(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid, user_id uuid,
  balance_ngn_kobo bigint, balance_usd_cents bigint,
  available_ngn_kobo bigint, available_usd_cents bigint,
  locked_ngn_kobo bigint, locked_usd_cents bigint,
  updated_at timestamptz
) AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets SET
      locked_usd_cents = locked_usd_cents - p_amount,
      available_usd_cents = available_usd_cents + p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.locked_usd_cents >= p_amount
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      locked_ngn_kobo = locked_ngn_kobo - p_amount,
      available_ngn_kobo = available_ngn_kobo + p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.locked_ngn_kobo >= p_amount
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION atomic_settlement_payout(
  p_user_id uuid,
  p_payout bigint,
  p_profit bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid, user_id uuid,
  balance_ngn_kobo bigint, balance_usd_cents bigint,
  available_ngn_kobo bigint, available_usd_cents bigint,
  locked_ngn_kobo bigint, locked_usd_cents bigint,
  total_winnings_ngn_kobo bigint, updated_at timestamptz
) AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets SET
      available_usd_cents = available_usd_cents + p_payout,
      balance_usd_cents = balance_usd_cents + GREATEST(0, p_profit),
      total_winnings_usd_cents = total_winnings_usd_cents + GREATEST(0, p_profit),
      updated_at = now()
    WHERE wallets.user_id = p_user_id
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.total_winnings_ngn_kobo, wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      available_ngn_kobo = available_ngn_kobo + p_payout,
      balance_ngn_kobo = balance_ngn_kobo + GREATEST(0, p_profit),
      total_winnings_ngn_kobo = total_winnings_ngn_kobo + GREATEST(0, p_profit),
      updated_at = now()
    WHERE wallets.user_id = p_user_id
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.total_winnings_ngn_kobo, wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION atomic_settlement_loss(
  p_user_id uuid,
  p_stake bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid, user_id uuid,
  balance_ngn_kobo bigint, balance_usd_cents bigint,
  available_ngn_kobo bigint, available_usd_cents bigint,
  updated_at timestamptz
) AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets SET
      balance_usd_cents = GREATEST(0, balance_usd_cents - p_stake),
      updated_at = now()
    WHERE wallets.user_id = p_user_id
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      balance_ngn_kobo = GREATEST(0, balance_ngn_kobo - p_stake),
      updated_at = now()
    WHERE wallets.user_id = p_user_id
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Settlement locking (from FLIPPE_SETTLEMENT_SAFETY_MIGRATION) — re-guaranteed.
CREATE OR REPLACE FUNCTION acquire_settlement_lock(
  p_market_id uuid,
  p_lock_owner uuid,
  p_timeout_seconds int DEFAULT 300
) RETURNS TABLE(locked boolean, error_message text) AS $$
DECLARE
  v_market RECORD;
BEGIN
  SELECT
    settlement_status,
    settlement_lock_owner,
    settlement_lock_expires_at
  INTO v_market
  FROM markets
  WHERE id = p_market_id;

  IF NOT FOUND THEN
    locked := false;
    error_message := 'Market not found';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_market.settlement_status IS DISTINCT FROM 'settling' OR v_market.settlement_lock_owner IS NULL THEN
    UPDATE markets SET
      settlement_status = 'settling',
      settlement_lock_owner = p_lock_owner,
      settlement_lock_acquired_at = now(),
      settlement_lock_expires_at = now() + (p_timeout_seconds || ' seconds')::interval
    WHERE id = p_market_id;

    locked := true;
    error_message := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_market.settlement_lock_expires_at > now() THEN
    locked := false;
    error_message := 'Settlement already in progress';
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE markets SET
    settlement_status = 'settling',
    settlement_lock_owner = p_lock_owner,
    settlement_lock_acquired_at = now(),
    settlement_lock_expires_at = now() + (p_timeout_seconds || ' seconds')::interval,
    settlement_error = NULL
  WHERE id = p_market_id;

  locked := true;
  error_message := NULL;
  RETURN NEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_settlement_lock(
  p_market_id uuid,
  p_lock_owner uuid,
  p_final_status text DEFAULT NULL,
  p_error text DEFAULT NULL
) RETURNS TABLE(released boolean) AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE markets SET
    settlement_status = COALESCE(p_final_status, settlement_status),
    settlement_error = p_error,
    settlement_lock_owner = NULL,
    settlement_lock_acquired_at = NULL,
    settlement_lock_expires_at = NULL
  WHERE id = p_market_id
    AND settlement_lock_owner = p_lock_owner;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  released := (v_updated > 0);
  RETURN NEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_stale_settlement_locks(
  p_max_age_seconds int DEFAULT 600
) RETURNS TABLE(cleaned_up_count integer) AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE markets SET
    settlement_status = 'failed',
    settlement_error = 'Settlement lock expired',
    settlement_lock_owner = NULL,
    settlement_lock_acquired_at = NULL,
    settlement_lock_expires_at = NULL
  WHERE settlement_status = 'settling'
    AND settlement_lock_expires_at < now()
    AND settlement_lock_expires_at < (now() - (p_max_age_seconds || ' seconds')::interval);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  cleaned_up_count := v_count;
  RETURN NEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 8: ORDER-BOOK REMOVAL (pool engine is the only market model)
-- ============================================================================

DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS order_fills CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS order_events CASCADE;
DROP TABLE IF EXISTS admin_audit_logs CASCADE;

DO $$
DECLARE
  col text;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'best_bid_price', 'best_ask_price', 'last_trade_price', 'last_trade_at',
    'total_orders_count', 'matched_volume_smallest_unit', 'max_exposure_per_user',
    'max_exposure_per_side', 'max_imbalance_ratio', 'max_order_size',
    'max_daily_exposure'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'markets' AND column_name = col
    ) THEN
      EXECUTE format('ALTER TABLE public.markets DROP COLUMN %I', col);
    END IF;
  END LOOP;

  FOREACH col IN ARRAY ARRAY['order_id', 'first_fill_price', 'last_fill_price', 'fill_count'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'positions' AND column_name = col
    ) THEN
      EXECUTE format('ALTER TABLE public.positions DROP COLUMN %I', col);
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS atomic_lock_for_order(uuid, bigint, text);
DROP FUNCTION IF EXISTS update_orders_updated_at();

-- ============================================================================
-- SECTION 9: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_created_by ON markets(created_by);
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_close_date ON markets(close_date);
CREATE INDEX IF NOT EXISTS idx_markets_visibility ON markets(visibility);
CREATE INDEX IF NOT EXISTS idx_markets_status_created ON markets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_status_volume ON markets(status, total_volume_smallest_unit DESC);
CREATE INDEX IF NOT EXISTS idx_markets_status_participants ON markets(status, participant_count DESC);
CREATE INDEX IF NOT EXISTS idx_markets_status_trades ON markets(status, trade_count DESC);
CREATE INDEX IF NOT EXISTS idx_markets_state ON markets(state);
CREATE INDEX IF NOT EXISTS idx_markets_closes_at ON markets(closes_at);
CREATE INDEX IF NOT EXISTS idx_markets_trading_close_at ON markets(trading_close_at);
CREATE INDEX IF NOT EXISTS idx_markets_activation_state ON markets(activation_state, status);
CREATE INDEX IF NOT EXISTS idx_markets_status_close ON markets(status, closes_at);
CREATE UNIQUE INDEX IF NOT EXISTS markets_invite_code_uniq
  ON markets(invite_code) WHERE invite_code IS NOT NULL;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS markets_question_trgm_idx ON markets USING gin (question gin_trgm_ops);
CREATE INDEX IF NOT EXISTS markets_description_trgm_idx ON markets USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_market_id ON positions(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_user_market ON positions(user_id, market_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_market_status_side ON positions(market_id, status, side);
CREATE INDEX IF NOT EXISTS idx_positions_market_settled ON positions(market_id, settled_at) WHERE settled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_positions_settlement_outcome ON positions(settlement_outcome);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status_created_at ON transactions(type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_position_id ON transactions(position_id) WHERE position_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deposit_requests_status_created_at ON deposit_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status_created_at ON withdrawal_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_price_history_market_id ON market_price_history(market_id);
CREATE INDEX IF NOT EXISTS idx_market_price_history_created_at ON market_price_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_resolution_logs_market ON market_resolution_logs(market_id);
CREATE INDEX IF NOT EXISTS idx_market_activity_market_created ON market_activity_events(market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_activity_user_created ON market_activity_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_trades_market_created ON market_trades(market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_trades_user_id ON market_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_bank_details_user_id ON saved_bank_details(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_value_user_created ON portfolio_value_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_created ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_market_comments_market ON market_comments(market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_comments_user ON market_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_market_promoters_user ON market_promoters(user_id);
CREATE INDEX IF NOT EXISTS idx_market_promoters_share ON market_promoters(share_code) WHERE share_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_creator_rewards_user ON creator_rewards(user_id, status);
CREATE INDEX IF NOT EXISTS idx_market_participants_user ON market_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_market_pools_total ON market_pools(total_pool_smallest_unit DESC);
CREATE INDEX IF NOT EXISTS idx_market_reviews_market ON market_reviews(market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_market_id ON market_audit_trail(market_id);
CREATE INDEX IF NOT EXISTS idx_audit_admin_user ON market_audit_trail(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_settlement_audit_market ON settlement_audit_log(market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON admin_notifications(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user ON fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_created ON fraud_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_settlements_market_created ON settlements(market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);

-- ============================================================================
-- SECTION 10: TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_markets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS markets_updated_at ON markets;
CREATE TRIGGER markets_updated_at
  BEFORE UPDATE ON markets
  FOR EACH ROW
  EXECUTE FUNCTION update_markets_updated_at();

CREATE OR REPLACE FUNCTION set_markets_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND (OLD.status IS NULL OR OLD.status != 'resolved') THEN
    NEW.resolved_at = CURRENT_TIMESTAMP;
    NEW.state = 'resolved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS markets_resolved_at ON markets;
CREATE TRIGGER markets_resolved_at
  BEFORE UPDATE ON markets
  FOR EACH ROW
  EXECUTE FUNCTION set_markets_resolved_at();

CREATE OR REPLACE FUNCTION set_markets_archived_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'archived' AND (OLD.status IS NULL OR OLD.status != 'archived') THEN
    NEW.archived_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS markets_archived_at ON markets;
CREATE TRIGGER markets_archived_at
  BEFORE UPDATE ON markets
  FOR EACH ROW
  EXECUTE FUNCTION set_markets_archived_at();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallets_updated_at ON wallets;
CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS deposit_requests_updated_at ON deposit_requests;
CREATE TRIGGER deposit_requests_updated_at
  BEFORE UPDATE ON deposit_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS withdrawal_requests_updated_at ON withdrawal_requests;
CREATE TRIGGER withdrawal_requests_updated_at
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS saved_bank_details_updated_at ON saved_bank_details;
CREATE TRIGGER saved_bank_details_updated_at
  BEFORE UPDATE ON saved_bank_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS platform_settings_updated_at ON platform_settings;
CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS leaderboard_entries_updated_at ON leaderboard_entries;
CREATE TRIGGER leaderboard_entries_updated_at
  BEFORE UPDATE ON leaderboard_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS feature_flags_updated_at ON feature_flags;
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 11: STORAGE BUCKETS (public market media)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-images', 'profile-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('market-images', 'market-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('market-videos', 'market-videos', true, 31457280, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public market image read') THEN
    CREATE POLICY "Public market image read" ON storage.objects FOR SELECT USING (bucket_id = 'market-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public market video read') THEN
    CREATE POLICY "Public market video read" ON storage.objects FOR SELECT USING (bucket_id = 'market-videos');
  END IF;
END $$;

-- ============================================================================
-- SECTION 12: GRANTS (service-role backed serverless architecture)
-- ============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT EXECUTE ON FUNCTION atomic_credit_deposit(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_reserve_for_withdrawal(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_approve_withdrawal(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_reject_withdrawal(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_decrement_available(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_refund_to_available(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_unlock_from_order(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_settlement_payout(uuid, bigint, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_settlement_loss(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION acquire_settlement_lock(uuid, uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION release_settlement_lock(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_stale_settlement_locks(int) TO service_role;

-- ============================================================================
-- SECTION 13: SEED DATA
-- ============================================================================

INSERT INTO categories (name, slug, display_order)
VALUES
  ('Sports', 'sports', 1),
  ('Crypto', 'crypto', 2),
  ('Politics', 'politics', 3),
  ('Economy', 'economy', 4),
  ('Entertainment', 'entertainment', 5),
  ('Music', 'music', 6),
  ('Technology', 'technology', 7),
  ('Business', 'business', 8),
  ('Global', 'global', 9),
  ('Other', 'other', 10)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO platform_settings (key, value, description)
VALUES
  ('platform_status', '{"status":"online","maintenanceMode":false}'::jsonb, 'Platform online/offline status'),
  ('prediction_limits', '{"minAmount":100,"maxAmount":100000}'::jsonb, 'Min/max prediction amounts in kobo')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- ============================================================================
-- SECTION 14: VERIFICATION (run after migration)
-- ============================================================================
--
-- 1. Every backend-referenced table exists:
--    SELECT tablename FROM pg_tables WHERE schemaname='public';
-- 2. Markets table has resolution_after_close + all pool columns:
--    SELECT constraint_name FROM pg_constraint
--    WHERE conrelid='markets'::regclass AND contype='c';
--    SELECT column_name FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='markets';
-- 3. Atomic wallet RPCs exist:
--    SELECT p.proname FROM pg_proc p
--    JOIN pg_namespace n ON p.pronamespace=n.oid
--    WHERE n.nspname='public' AND p.proname LIKE 'atomic_%';
-- 4. No RLS stragglers on app tables:
--    SELECT relname FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
--    WHERE n.nspname='public' AND c.relrowsecurity;
-- ============================================================================

-- Cleanup helpers (keep them out of the way after use).
-- DROP FUNCTION IF EXISTS add_column_if_missing(text,text,text,text);
-- DROP FUNCTION IF EXISTS drop_constraint_if_exists(text,text);
-- DROP FUNCTION IF EXISTS drop_constraints_by_name(text, VARIADIC text[]);