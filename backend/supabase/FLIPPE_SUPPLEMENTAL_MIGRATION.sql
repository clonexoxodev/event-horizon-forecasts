-- ============================================================================
-- FLIPPE SUPPLEMENTAL MIGRATION
-- Version: 1.0
-- Date: 2026-07-21
--
-- This migration covers everything the Master Migration does NOT create
-- but the backend code references. It is fully idempotent.
--
-- Safe to run multiple times. Execute AFTER FLIPPE_MASTER_MIGRATION.sql.
-- ============================================================================

-- ============================================================================
-- SECTION 1: HELPER FUNCTION (safe re-creation)
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

-- ============================================================================
-- SECTION 2: MISSING TABLES (from prior migrations that may not have run)
-- ============================================================================

-- 2.1 deposit_requests (from wallet_v1_finance)
CREATE TABLE IF NOT EXISTS deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount_smallest_unit bigint NOT NULL CHECK (amount_smallest_unit > 0),
  currency text NOT NULL DEFAULT 'NGN',
  reference text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'manual',
  payment_instruction text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected', 'failed')),
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.2 withdrawal_requests (from wallet_v1_finance)
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
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected', 'failed')),
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.3 market_trades (from market_engine_v1)
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

-- 2.4 market_price_history (from market_engine_v1)
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
  created_at timestamptz NOT NULL DEFAULT now(),
  yes_volume_smallest_unit bigint NOT NULL DEFAULT 0,
  no_volume_smallest_unit bigint NOT NULL DEFAULT 0,
  total_yes_shares numeric NOT NULL DEFAULT 0,
  total_no_shares numeric NOT NULL DEFAULT 0
);

-- 2.5 market_resolution_logs (from market_engine_v1)
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

-- 2.6 market_activity_events (from market_engine_v2_ownership)
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

-- 2.7 saved_bank_details (from wallet_admin_final_fixes)
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

-- 2.8 platform_settings (from admin_ops)
CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.9 payout_records (from admin_ops)
CREATE TABLE IF NOT EXISTS payout_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  position_id uuid,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_smallest_unit bigint NOT NULL CHECK (amount_smallest_unit > 0),
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payout_method text,
  reference text,
  processed_by uuid REFERENCES public.users(id),
  processed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.10 dispute_reports (from admin_ops)
CREATE TABLE IF NOT EXISTS dispute_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  position_id uuid,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'rejected')),
  resolved_by uuid REFERENCES public.users(id),
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.11 portfolio_value_history (from market_engine_v2_ownership)
CREATE TABLE IF NOT EXISTS portfolio_value_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_value_smallest_unit bigint NOT NULL DEFAULT 0,
  cash_value_smallest_unit bigint NOT NULL DEFAULT 0,
  position_value_smallest_unit bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.12 user_activity_logs (from admin_ops)
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.13 leaderboard_entries (if not in base)
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

-- 2.14 position_listings (if not in base)
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

-- ============================================================================
-- SECTION 3: MISSING COLUMNS (on tables that may already exist)
-- ============================================================================

-- 3.1 Markets: columns from v2_ownership and other migrations
SELECT add_column_if_missing('markets', 'starting_yes_price', 'numeric', '50');
SELECT add_column_if_missing('markets', 'starting_no_price', 'numeric', '50');
SELECT add_column_if_missing('markets', 'yes_volume_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'no_volume_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'total_yes_shares', 'numeric', '0');
SELECT add_column_if_missing('markets', 'total_no_shares', 'numeric', '0');
SELECT add_column_if_missing('markets', 'settlement_pool_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'platform_fee_bps', 'integer', '0');
SELECT add_column_if_missing('markets', 'trade_count', 'integer', '0');
SELECT add_column_if_missing('markets', 'total_volume_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'seed_liquidity_yes_smallest_unit', 'bigint', '50000');
SELECT add_column_if_missing('markets', 'seed_liquidity_no_smallest_unit', 'bigint', '50000');
SELECT add_column_if_missing('markets', 'trading_close_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'activated_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'activation_snapshot', 'jsonb', $$'{}'::jsonb$$);
SELECT add_column_if_missing('markets', 'protected_market_enabled', 'boolean', 'true');
SELECT add_column_if_missing('markets', 'activation_threshold_smallest_unit', 'bigint', '1000000');
SELECT add_column_if_missing('markets', 'activation_yes_min_smallest_unit', 'bigint', '200000');
SELECT add_column_if_missing('markets', 'activation_no_min_smallest_unit', 'bigint', '200000');
SELECT add_column_if_missing('markets', 'activation_min_participants', 'integer', '5');
SELECT add_column_if_missing('markets', 'protected_max_stake_smallest_unit', 'bigint', '100000');
SELECT add_column_if_missing('markets', 'refunded_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'cancel_reason', 'text');
SELECT add_column_if_missing('markets', 'payout_status', 'text', $$'not_applicable'$$);
SELECT add_column_if_missing('markets', 'payout_completed_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'rules', 'text');
SELECT add_column_if_missing('markets', 'refund_reason', 'text');
SELECT add_column_if_missing('markets', 'refund_status', 'text');
SELECT add_column_if_missing('markets', 'refunded_by', 'uuid');
SELECT add_column_if_missing('markets', 'activated_by', 'uuid');
SELECT add_column_if_missing('markets', 'cancelled_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'yes_label', 'text', $$'YES'$$);
SELECT add_column_if_missing('markets', 'no_label', 'text', $$'NO'$$);
SELECT add_column_if_missing('markets', 'resolution_date', 'timestamptz');
SELECT add_column_if_missing('markets', 'resolution_instructions', 'text');

-- 3.2 Markets: activation_state (may have different default across migrations)
SELECT add_column_if_missing('markets', 'activation_state', 'text', $$'protected'$$);

-- 3.3 Positions: columns from v2_ownership and pool_safe_projection
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
SELECT add_column_if_missing('positions', 'outcome', 'text');
SELECT add_column_if_missing('positions', 'market_question_snapshot', 'text');
SELECT add_column_if_missing('positions', 'market_category_snapshot', 'text');
SELECT add_column_if_missing('positions', 'potential_return_smallest_unit', 'bigint');

-- 3.4 Transactions: columns from wallet_v1_finance
SELECT add_column_if_missing('transactions', 'market_id', 'uuid');
SELECT add_column_if_missing('transactions', 'position_id', 'uuid');
SELECT add_column_if_missing('transactions', 'reference', 'text');
SELECT add_column_if_missing('transactions', 'description', 'text');
SELECT add_column_if_missing('transactions', 'approved_by', 'uuid');
SELECT add_column_if_missing('transactions', 'approved_at', 'timestamptz');
SELECT add_column_if_missing('transactions', 'updated_at', 'timestamptz', 'now()');
SELECT add_column_if_missing('transactions', 'metadata', 'jsonb', $$'{}'::jsonb$$);

-- 3.5 Notifications: metadata column
SELECT add_column_if_missing('notifications', 'metadata', 'jsonb', $$'{}'::jsonb$$);
SELECT add_column_if_missing('notifications', 'read_at', 'timestamptz');

-- 3.6 Users: password_hash (might be missing if created via supabase auth)
SELECT add_column_if_missing('users', 'password_hash', 'text');
SELECT add_column_if_missing('users', 'updated_at', 'timestamptz', 'now()');

-- 3.7 Profiles: extra columns
SELECT add_column_if_missing('profiles', 'display_name', 'text');
SELECT add_column_if_missing('profiles', 'avatar_url', 'text');
SELECT add_column_if_missing('profiles', 'profile_image_url', 'text');
SELECT add_column_if_missing('profiles', 'balance', 'numeric', '0');

-- ============================================================================
-- SECTION 4: INDEXES
-- ============================================================================

-- 4.1 deposit_requests indexes
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status_created_at ON deposit_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id, created_at DESC);

-- 4.2 withdrawal_requests indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status_created_at ON withdrawal_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id, created_at DESC);

-- 4.3 market_trades indexes
CREATE INDEX IF NOT EXISTS idx_market_trades_market_created ON market_trades(market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_trades_market_id ON market_trades(market_id);
CREATE INDEX IF NOT EXISTS idx_market_trades_user_id ON market_trades(user_id);

-- 4.4 market_price_history indexes
CREATE INDEX IF NOT EXISTS idx_market_price_history_market_created ON market_price_history(market_id, created_at DESC);

-- 4.5 market_resolution_logs indexes
CREATE INDEX IF NOT EXISTS idx_market_resolution_logs_market ON market_resolution_logs(market_id);

-- 4.6 market_activity_events indexes
CREATE INDEX IF NOT EXISTS idx_market_activity_market_created ON market_activity_events(market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_activity_user_created ON market_activity_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_activity_market_id ON market_activity_events(market_id);

-- 4.7 saved_bank_details indexes
CREATE INDEX IF NOT EXISTS idx_saved_bank_details_user_id ON saved_bank_details(user_id);

-- 4.8 portfolio_value_history indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_value_user_created ON portfolio_value_history(user_id, created_at DESC);

-- 4.9 user_activity_logs indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_created ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_event_created ON user_activity_logs(event_type, created_at DESC);

-- 4.10 Markets: additional indexes
CREATE INDEX IF NOT EXISTS idx_markets_status_close ON markets(status, closes_at);
CREATE INDEX IF NOT EXISTS idx_markets_trading_close_at ON markets(trading_close_at);
CREATE INDEX IF NOT EXISTS idx_markets_activation_state ON markets(activation_state, status);
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);

-- 4.11 Transactions: additional indexes
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status_created_at ON transactions(type, status, created_at DESC);

-- 4.12 Positions: additional indexes
CREATE INDEX IF NOT EXISTS idx_positions_market_id ON positions(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);

-- ============================================================================
-- SECTION 5: CONSTRAINTS
-- ============================================================================

-- 5.1 Fix notifications type constraint (add all types code uses)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_v1_check;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'market_resolved', 'deposit_confirmed', 'withdrawal_confirmed',
    'position_won', 'position_lost', 'position_sold',
    'forecast_confirmed', 'market_ended', 'market_payout',
    'new_market', 'wallet_low',
    'deposit_request_created', 'deposit_approved', 'deposit_rejected',
    'withdrawal_requested', 'withdrawal_approved', 'withdrawal_rejected',
    'system',
    'settlement_won', 'settlement_lost',
    'order_refunded', 'refund',
    'order_filled', 'order_cancelled', 'order_expired'
  ));

-- 5.2 Fix markets status constraint
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_status_check;
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_status_v1_check;
ALTER TABLE markets ADD CONSTRAINT markets_status_v1_check
  CHECK (status IN ('draft', 'active', 'closed', 'pending_resolution', 'resolving', 'resolved', 'cancelled', 'archived', 'refunded', 'open', 'paused'));

-- 5.3 Fix markets pricing_model constraint
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_pricing_model_check;
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_pricing_model_v2_check;
ALTER TABLE markets ADD CONSTRAINT markets_pricing_model_check
  CHECK (pricing_model IN ('pool', 'orderbook', 'ownership_shares', 'legacy_fixed_share', 'legacy_pool'));

-- 5.4 Fix markets settlement_status constraint
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_settlement_status_check;
ALTER TABLE markets ADD CONSTRAINT markets_settlement_status_check
  CHECK (settlement_status IN ('idle', 'pending', 'settling', 'completed', 'failed', 'refunding', 'refunded', 'cancelled'));

-- 5.5 Fix markets activation_state constraint
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_activation_state_check;
ALTER TABLE markets ADD CONSTRAINT markets_activation_state_check
  CHECK (activation_state IN ('protected', 'building', 'live', 'resolved', 'refunded'));

-- 5.6 Fix markets payout_status constraint
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_payout_status_v1_check;
ALTER TABLE markets ADD CONSTRAINT markets_payout_status_v1_check
  CHECK (payout_status IN ('not_applicable', 'pending', 'processing', 'completed', 'failed'));

-- 5.7 Fix transactions type constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_v1_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_v1_check
  CHECK (type IN (
    'deposit', 'withdrawal', 'position_entry', 'position_payout', 'refund',
    'deposit_request', 'deposit_approved', 'deposit_rejected',
    'withdrawal_request', 'withdrawal_approved', 'withdrawal_rejected',
    'prediction_stake', 'market_payout', 'admin_adjustment'
  ));

-- 5.8 Fix transactions direction constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_direction_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_direction_v1_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_direction_v1_check
  CHECK (direction IN ('IN', 'OUT', 'HOLD', 'RELEASE'));

-- 5.9 Fix transactions status constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_v1_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_status_v1_check
  CHECK (status IN ('pending', 'completed', 'failed', 'rejected'));

-- 5.10 Fix transactions reference_type constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_reference_type_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_reference_type_v1_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_reference_type_v1_check
  CHECK (reference_type IS NULL OR reference_type IN (
    'position', 'deposit', 'withdrawal', 'deposit_request', 'withdrawal_request', 'market'
  ));

-- 5.11 Fix users account_status constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_v1_check;
ALTER TABLE users ADD CONSTRAINT users_account_status_v1_check
  CHECK (account_status IN ('active', 'suspended', 'closed'));

-- 5.12 Fix users role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_v1_check;
ALTER TABLE users ADD CONSTRAINT users_role_v1_check
  CHECK (role IN ('user', 'admin', 'super_admin'));

-- 5.13 Fix withdrawal_requests status constraint
ALTER TABLE withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_status_check;
ALTER TABLE withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_status_v1_check;
ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_status_v1_check
  CHECK (status IN ('pending', 'approved', 'denied', 'paid', 'completed', 'rejected', 'failed'));

-- 5.14 Fix market_activity_events event_type constraint
ALTER TABLE market_activity_events DROP CONSTRAINT IF EXISTS market_activity_events_type_check;
ALTER TABLE market_activity_events DROP CONSTRAINT IF EXISTS market_activity_events_type_v2_check;
ALTER TABLE market_activity_events ADD CONSTRAINT market_activity_events_type_v2_check
  CHECK (event_type IN (
    'bought_yes', 'bought_no', 'position_value_increase', 'position_value_decrease',
    'market_closed', 'market_resolved', 'ownership_changed',
    'settlement_payout', 'settlement_loss'
  ));

-- 5.15 Drop available_lte_balance if it still exists
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS available_lte_balance;

-- ============================================================================
-- SECTION 6: VIEWS
-- ============================================================================

-- 6.1 user_positions view
DROP VIEW IF EXISTS user_positions;
CREATE OR REPLACE VIEW user_positions AS
SELECT
  p.id,
  p.user_id,
  p.market_id,
  p.side,
  p.amount_smallest_unit,
  p.currency,
  p.is_winner,
  p.payout_smallest_unit,
  p.entry_price,
  p.shares_received,
  p.price_at_purchase,
  p.status,
  p.created_at,
  p.resolved_at,
  p.settled_at,
  m.question AS market_question,
  m.status AS market_status,
  m.winning_outcome,
  m.resolved_at AS market_resolved_at
FROM positions p
JOIN markets m ON m.id = p.market_id;

-- 6.2 wallet_transactions view
DROP VIEW IF EXISTS wallet_transactions;
CREATE OR REPLACE VIEW wallet_transactions AS
SELECT
  t.id,
  t.user_id,
  t.wallet_id,
  t.type,
  t.amount_smallest_unit,
  t.currency,
  t.direction,
  t.status,
  t.reference_id,
  t.reference_type,
  t.description,
  t.created_at,
  t.updated_at
FROM transactions t;

-- ============================================================================
-- SECTION 7: TRIGGERS
-- ============================================================================

-- 7.1 update_updated_at_column function (from init.sql)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7.2 Auto-update updated_at on wallets
DROP TRIGGER IF EXISTS wallets_updated_at ON wallets;
CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7.3 Auto-update updated_at on transactions
DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7.4 Auto-update updated_at on deposit_requests
DROP TRIGGER IF EXISTS deposit_requests_updated_at ON deposit_requests;
CREATE TRIGGER deposit_requests_updated_at
  BEFORE UPDATE ON deposit_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7.5 Auto-update updated_at on withdrawal_requests
DROP TRIGGER IF EXISTS withdrawal_requests_updated_at ON withdrawal_requests;
CREATE TRIGGER withdrawal_requests_updated_at
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7.6 Auto-update updated_at on saved_bank_details
DROP TRIGGER IF EXISTS saved_bank_details_updated_at ON saved_bank_details;
CREATE TRIGGER saved_bank_details_updated_at
  BEFORE UPDATE ON saved_bank_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7.7 Auto-update updated_at on platform_settings
DROP TRIGGER IF EXISTS platform_settings_updated_at ON platform_settings;
CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7.8 Auto-update updated_at on leaderboard_entries
DROP TRIGGER IF EXISTS leaderboard_entries_updated_at ON leaderboard_entries;
CREATE TRIGGER leaderboard_entries_updated_at
  BEFORE UPDATE ON leaderboard_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 8: RLS POLICIES
-- ============================================================================

-- 8.1 Enable RLS on all new tables
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_resolution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_bank_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_value_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- 8.2 deposit_requests policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deposit_requests: own read' AND tablename = 'deposit_requests') THEN
    CREATE POLICY "deposit_requests: own read" ON deposit_requests
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deposit_requests: own insert' AND tablename = 'deposit_requests') THEN
    CREATE POLICY "deposit_requests: own insert" ON deposit_requests
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 8.3 withdrawal_requests policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'withdrawal_requests: own read' AND tablename = 'withdrawal_requests') THEN
    CREATE POLICY "withdrawal_requests: own read" ON withdrawal_requests
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'withdrawal_requests: own insert' AND tablename = 'withdrawal_requests') THEN
    CREATE POLICY "withdrawal_requests: own insert" ON withdrawal_requests
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 8.4 market_trades policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'market_trades: public read' AND tablename = 'market_trades') THEN
    CREATE POLICY "market_trades: public read" ON market_trades
      FOR SELECT USING (true);
  END IF;
END $$;

-- 8.5 market_price_history policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'market_price_history: public read' AND tablename = 'market_price_history') THEN
    CREATE POLICY "market_price_history: public read" ON market_price_history
      FOR SELECT USING (true);
  END IF;
END $$;

-- 8.6 market_resolution_logs policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'market_resolution_logs: public read' AND tablename = 'market_resolution_logs') THEN
    CREATE POLICY "market_resolution_logs: public read" ON market_resolution_logs
      FOR SELECT USING (true);
  END IF;
END $$;

-- 8.7 market_activity_events policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'market_activity_events: public read' AND tablename = 'market_activity_events') THEN
    CREATE POLICY "market_activity_events: public read" ON market_activity_events
      FOR SELECT USING (true);
  END IF;
END $$;

-- 8.8 saved_bank_details policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'saved_bank_details: own read' AND tablename = 'saved_bank_details') THEN
    CREATE POLICY "saved_bank_details: own read" ON saved_bank_details
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'saved_bank_details: own insert' AND tablename = 'saved_bank_details') THEN
    CREATE POLICY "saved_bank_details: own insert" ON saved_bank_details
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'saved_bank_details: own update' AND tablename = 'saved_bank_details') THEN
    CREATE POLICY "saved_bank_details: own update" ON saved_bank_details
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 8.9 notifications policies (service role inserts from backend)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications: own read' AND tablename = 'notifications') THEN
    CREATE POLICY "notifications: own read" ON notifications
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications: own update' AND tablename = 'notifications') THEN
    CREATE POLICY "notifications: own update" ON notifications
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- SECTION 9: GRANTS
-- ============================================================================

GRANT ALL ON deposit_requests TO service_role;
GRANT ALL ON withdrawal_requests TO service_role;
GRANT ALL ON market_trades TO service_role;
GRANT ALL ON market_price_history TO service_role;
GRANT ALL ON market_resolution_logs TO service_role;
GRANT ALL ON market_activity_events TO service_role;
GRANT ALL ON saved_bank_details TO service_role;
GRANT ALL ON platform_settings TO service_role;
GRANT ALL ON payout_records TO service_role;
GRANT ALL ON dispute_reports TO service_role;
GRANT ALL ON portfolio_value_history TO service_role;
GRANT ALL ON user_activity_logs TO service_role;
GRANT ALL ON leaderboard_entries TO service_role;
GRANT ALL ON position_listings TO service_role;

GRANT SELECT ON deposit_requests TO authenticated;
GRANT SELECT, INSERT ON withdrawal_requests TO authenticated;
GRANT SELECT ON market_trades TO authenticated;
GRANT SELECT ON market_price_history TO authenticated;
GRANT SELECT ON market_resolution_logs TO authenticated;
GRANT SELECT ON market_activity_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON saved_bank_details TO authenticated;

-- ============================================================================
-- SECTION 10: SEED DATA
-- ============================================================================

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-images', 'profile-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('market-images', 'market-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('market-videos', 'market-videos', true, 31457280, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Platform settings defaults
INSERT INTO platform_settings (key, value, description)
VALUES
  ('platform_status', '{"status":"online","maintenanceMode":false}'::jsonb, 'Platform online/offline status'),
  ('prediction_limits', '{"minAmount":100,"maxAmount":100000}'::jsonb, 'Min/max prediction amounts in kobo')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- ============================================================================
-- SECTION 11: VERIFICATION
-- ============================================================================

-- 11.1 All tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 11.2 All functions exist
SELECT p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'pg_%'
  AND p.proname NOT LIKE 'inform%'
ORDER BY p.proname;

-- 11.3 All views exist
SELECT viewname
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- 11.4 All triggers exist
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 11.5 All RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 11.6 Summary
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS total_tables,
  (SELECT COUNT(*) FROM pg_views WHERE schemaname='public') AS total_views,
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname NOT LIKE 'pg_%') AS total_functions,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public') AS total_indexes,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public') AS total_policies;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
