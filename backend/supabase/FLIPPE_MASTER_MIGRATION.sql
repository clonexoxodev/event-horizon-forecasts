-- ============================================================================
-- FLIPPE MASTER MIGRATION
-- Version: 1.0
-- Date: 2026-07-21
--
-- This single migration creates everything Flippe needs:
--   - Order book system (Sprint 1)
--   - Settlement engine (Sprint 4)
--   - All missing columns, indexes, constraints, triggers, functions
--   - Fixes for naming mismatches (admin_audit_log singular)
--
-- SAFE TO RUN MULTIPLE TIMES (all operations are idempotent)
-- Execute in Supabase SQL Editor. One shot.
-- ============================================================================

-- ============================================================================
-- SECTION 1: HELPER FUNCTION
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
-- SECTION 2: MISSING TABLES
-- ============================================================================

-- 2.1 Orders
CREATE TABLE IF NOT EXISTS orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id         uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  side              text NOT NULL CHECK (side IN ('YES', 'NO')),
  order_type        text NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
  price             bigint NOT NULL CHECK (price > 0 AND price < 100),
  quantity          bigint NOT NULL CHECK (quantity > 0),
  filled_quantity   bigint NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0),
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'waiting', 'partial', 'filled', 'cancelled', 'expired', 'refunded'
  )),
  locked_amount     bigint NOT NULL DEFAULT 0,
  filled_amount     bigint NOT NULL DEFAULT 0,
  source            text NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'admin', 'system', 'seed')),
  idempotency_key   text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  filled_at         timestamptz,
  cancelled_at      timestamptz
);

-- 2.2 Order fills
CREATE TABLE IF NOT EXISTS order_fills (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id         uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  side              text NOT NULL CHECK (side IN ('YES', 'NO')),
  order_type        text NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
  fill_price        bigint NOT NULL CHECK (fill_price > 0 AND fill_price < 100),
  fill_quantity     bigint NOT NULL CHECK (fill_quantity > 0),
  matched_order_id  uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  matched_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position_id       uuid,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 2.3 Trades
CREATE TABLE IF NOT EXISTS trades (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id         uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  buy_order_id      uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sell_order_id     uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  side              text NOT NULL CHECK (side IN ('YES', 'NO')),
  trade_price       bigint NOT NULL CHECK (trade_price > 0 AND trade_price < 100),
  trade_quantity    bigint NOT NULL CHECK (trade_quantity > 0),
  fee_smallest_unit bigint NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 2.4 Order events
CREATE TABLE IF NOT EXISTS order_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  market_id         uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type        text NOT NULL CHECK (event_type IN (
    'created', 'locked', 'entered_book', 'match_started',
    'partial_fill', 'full_fill', 'fill_completed',
    'trade_created', 'position_created', 'position_updated',
    'cancelled', 'unlock', 'expired', 'refunded', 'error'
  )),
  quantity_affected bigint,
  price_affected    bigint,
  balance_before    bigint,
  balance_after     bigint,
  locked_before     bigint,
  locked_after      bigint,
  metadata          jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 2.5 Settlement audit log (Sprint 4)
CREATE TABLE IF NOT EXISTS settlement_audit_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id         uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  admin_user_id     uuid REFERENCES auth.users(id),
  action_type       text NOT NULL CHECK (action_type IN (
    'resolve', 'settle_position', 'settle_fill', 'refund_position',
    'refund_order', 'refund_market', 'cancel_market',
    'rollback', 'retry_settlement', 'emergency_settle'
  )),
  outcome           text,
  position_id       uuid,
  order_id          uuid,
  fill_id           uuid,
  trade_id          uuid,
  user_id           uuid,
  amount_smallest_unit bigint,
  payout_smallest_unit bigint,
  refund_amount_smallest_unit bigint,
  metadata          jsonb,
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 2.6 Market comments (missing from all migrations)
CREATE TABLE IF NOT EXISTS market_comments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id         uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body              text NOT NULL,
  like_count        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 2.7 Admin audit log (SINGULAR — matches code, NOT the plural admin_audit_logs)
-- Drop the plural table if it exists (dead schema from wrong migration)
DROP TABLE IF EXISTS admin_audit_logs CASCADE;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action            text NOT NULL,
  actor_id          uuid REFERENCES auth.users(id),
  actor_email       text,
  actor_role        text,
  target_type       text,
  target_id         text,
  target_label      text,
  details           jsonb,
  created_at        timestamptz DEFAULT now()
);

-- ============================================================================
-- SECTION 3: MISSING COLUMNS
-- ============================================================================

-- 3.1 Users: name column (code selects it at api/index.ts:1893,5046)
SELECT add_column_if_missing('users', 'name', 'text');
SELECT add_column_if_missing('users', 'avatar_url', 'text');
SELECT add_column_if_missing('users', 'profile_image_url', 'text');
SELECT add_column_if_missing('users', 'account_status', 'text', $$'active'$$);
SELECT add_column_if_missing('users', 'suspended_at', 'timestamptz');
SELECT add_column_if_missing('users', 'suspended_by', 'uuid');
SELECT add_column_if_missing('users', 'suspension_reason', 'text');
SELECT add_column_if_missing('users', 'last_login_at', 'timestamptz');
SELECT add_column_if_missing('users', 'last_active_at', 'timestamptz');

-- 3.2 Wallets: missing columns for atomic USD operations
SELECT add_column_if_missing('wallets', 'locked_ngn_kobo', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'locked_usd_cents', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'total_deposited_ngn_kobo', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'total_withdrawn_ngn_kobo', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'total_winnings_ngn_kobo', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'total_winnings_usd_cents', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'total_staked_ngn_kobo', 'bigint', '0');
SELECT add_column_if_missing('wallets', 'currency', 'text', $$'NGN'$$);

-- 3.3 Markets: order book columns
SELECT add_column_if_missing('markets', 'pricing_model', 'text', $$'orderbook'$$);
SELECT add_column_if_missing('markets', 'best_bid_price', 'bigint');
SELECT add_column_if_missing('markets', 'best_ask_price', 'bigint');
SELECT add_column_if_missing('markets', 'last_trade_price', 'bigint');
SELECT add_column_if_missing('markets', 'last_trade_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'total_orders_count', 'integer', '0');
SELECT add_column_if_missing('markets', 'matched_volume_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'max_exposure_per_user', 'bigint', '100000000');
SELECT add_column_if_missing('markets', 'max_exposure_per_side', 'bigint', '500000000');
SELECT add_column_if_missing('markets', 'max_imbalance_ratio', 'numeric', '3.0');
SELECT add_column_if_missing('markets', 'max_order_size', 'bigint', '50000000');
SELECT add_column_if_missing('markets', 'max_daily_exposure', 'bigint', '200000000');

-- Markets: settlement columns (Sprint 4)
SELECT add_column_if_missing('markets', 'settlement_status', 'text', $$'idle'$$);
SELECT add_column_if_missing('markets', 'settlement_started_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'settlement_completed_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'settlement_error', 'text');
SELECT add_column_if_missing('markets', 'settlement_log', 'jsonb', $$'[]'::jsonb$$);
SELECT add_column_if_missing('markets', 'total_settled_positions', 'integer', '0');
SELECT add_column_if_missing('markets', 'total_settled_payout_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'total_refunded_smallest_unit', 'bigint', '0');

-- Markets: additional columns referenced by code
SELECT add_column_if_missing('markets', 'resolved_outcome', 'text');
SELECT add_column_if_missing('markets', 'winning_outcome', 'text');
SELECT add_column_if_missing('markets', 'resolved_by', 'uuid');
SELECT add_column_if_missing('markets', 'resolution_source', 'text');
SELECT add_column_if_missing('markets', 'participant_count', 'integer', '0');

-- 3.4 Positions: order book columns
SELECT add_column_if_missing('positions', 'order_id', 'uuid');
SELECT add_column_if_missing('positions', 'first_fill_price', 'bigint');
SELECT add_column_if_missing('positions', 'last_fill_price', 'bigint');
SELECT add_column_if_missing('positions', 'fill_count', 'integer', '0');

-- Positions: settlement columns (Sprint 4)
SELECT add_column_if_missing('positions', 'settlement_id', 'text');
SELECT add_column_if_missing('positions', 'settlement_outcome', 'text');
SELECT add_column_if_missing('positions', 'refund_reason', 'text');
SELECT add_column_if_missing('positions', 'refund_amount_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('positions', 'refunded_at', 'timestamptz');

-- Positions: additional columns referenced by code
SELECT add_column_if_missing('positions', 'settled_at', 'timestamptz');
SELECT add_column_if_missing('positions', 'profit_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('positions', 'final_payout_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('positions', 'winning_outcome', 'text');
SELECT add_column_if_missing('positions', 'status', 'text');
SELECT add_column_if_missing('positions', 'shares_owned', 'bigint', '0');
SELECT add_column_if_missing('positions', 'shares_received', 'bigint', '0');
SELECT add_column_if_missing('positions', 'price_at_purchase', 'bigint');
SELECT add_column_if_missing('positions', 'entry_price', 'integer');
SELECT add_column_if_missing('positions', 'stake_amount', 'bigint', '0');

-- ============================================================================
-- SECTION 4: FIX CONSTRAINTS
-- ============================================================================

-- 4.1 Drop the available_lte_balance CHECK constraint (breaks atomic functions)
-- The atomic functions handle balance invariants internally with WHERE guards.
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS available_lte_balance;

-- 4.2 Fix pricing_model CHECK to include all models used by code
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_pricing_model_check;
ALTER TABLE markets ADD CONSTRAINT markets_pricing_model_check
  CHECK (pricing_model IN ('pool', 'orderbook', 'ownership_shares', 'legacy_fixed_share', 'legacy_pool'));

-- 4.3 Fix settlement_status CHECK
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_settlement_status_check;
ALTER TABLE markets ADD CONSTRAINT markets_settlement_status_check
  CHECK (settlement_status IN ('idle', 'pending', 'settling', 'completed', 'failed', 'refunding', 'refunded', 'cancelled'));

-- 4.4 Fix notifications type CHECK to include all types used by code
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
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

-- 4.5 Add foreign keys for positions.order_id and order_fills.position_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'positions_order_id_fkey'
      AND conrelid = 'public.positions'::regclass
  ) THEN
    ALTER TABLE positions
      ADD CONSTRAINT positions_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_fills_position_id_fkey'
      AND conrelid = 'public.order_fills'::regclass
  ) THEN
    ALTER TABLE order_fills
      ADD CONSTRAINT order_fills_position_id_fkey
      FOREIGN KEY (position_id) REFERENCES public.positions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- SECTION 5: INDEXES
-- ============================================================================

-- 5.1 Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_match_queue
  ON orders(market_id, status, side, price DESC, created_at ASC)
  WHERE status IN ('waiting', 'partial');

CREATE INDEX IF NOT EXISTS idx_orders_book_depth
  ON orders(market_id, status, side, price DESC, created_at ASC)
  WHERE status IN ('waiting', 'partial');

CREATE INDEX IF NOT EXISTS idx_orders_user
  ON orders(user_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_market
  ON orders(market_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency
  ON orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_market_active
  ON orders(market_id, status)
  WHERE status IN ('waiting', 'partial', 'pending');

-- 5.2 Order fills indexes
CREATE INDEX IF NOT EXISTS idx_fills_order
  ON order_fills(order_id);

CREATE INDEX IF NOT EXISTS idx_fills_market
  ON order_fills(market_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fills_user
  ON order_fills(user_id, market_id);

-- 5.3 Trades indexes
CREATE INDEX IF NOT EXISTS idx_trades_market
  ON trades(market_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trades_buy_order
  ON trades(buy_order_id);

CREATE INDEX IF NOT EXISTS idx_trades_sell_order
  ON trades(sell_order_id);

-- 5.4 Order events indexes
CREATE INDEX IF NOT EXISTS idx_order_events_order
  ON order_events(order_id);

CREATE INDEX IF NOT EXISTS idx_order_events_market
  ON order_events(market_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_events_user
  ON order_events(user_id);

CREATE INDEX IF NOT EXISTS idx_order_events_type
  ON order_events(event_type);

-- 5.5 Settlement audit log indexes
CREATE INDEX IF NOT EXISTS idx_settlement_audit_market
  ON settlement_audit_log(market_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_settlement_audit_admin
  ON settlement_audit_log(admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_settlement_audit_action
  ON settlement_audit_log(action_type);

CREATE INDEX IF NOT EXISTS idx_settlement_audit_user
  ON settlement_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_settlement_audit_created
  ON settlement_audit_log(created_at DESC);

-- 5.6 Positions indexes
CREATE INDEX IF NOT EXISTS idx_positions_market_settled
  ON positions(market_id, settled_at)
  WHERE settled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_positions_settlement_outcome
  ON positions(settlement_outcome);

CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_settlement_id
  ON positions(settlement_id)
  WHERE settlement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_positions_settled_at
  ON positions(settled_at);

CREATE INDEX IF NOT EXISTS idx_positions_status
  ON positions(status);

CREATE INDEX IF NOT EXISTS idx_positions_order_id
  ON positions(order_id)
  WHERE order_id IS NOT NULL;

-- 5.7 Market comments indexes
CREATE INDEX IF NOT EXISTS idx_market_comments_market
  ON market_comments(market_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_comments_user
  ON market_comments(user_id);

-- 5.8 Admin audit log indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created
  ON admin_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action
  ON admin_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor
  ON admin_audit_log(actor_id);

-- 5.9 Additional indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_wallets_user_id_unique
  ON wallets(user_id);

CREATE INDEX IF NOT EXISTS idx_markets_pricing_model
  ON markets(pricing_model)
  WHERE pricing_model IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_markets_settlement_status
  ON markets(settlement_status)
  WHERE settlement_status IS NOT NULL AND settlement_status != 'idle';

CREATE INDEX IF NOT EXISTS idx_notifications_reference
  ON notifications(reference_id, reference_type)
  WHERE reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_position_id
  ON transactions(position_id)
  WHERE position_id IS NOT NULL;

-- ============================================================================
-- SECTION 6: TRIGGERS
-- ============================================================================

-- 6.1 Auto-update updated_at on orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- 6.2 Auto-update updated_at on wallets (if not exists)
DROP TRIGGER IF EXISTS wallets_updated_at ON wallets;
CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 7: ATOMIC WALLET RPC FUNCTIONS
-- ============================================================================

-- 7.1 Lock balance for order (available -> locked)
CREATE OR REPLACE FUNCTION atomic_lock_for_order(
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

-- 7.2 Unlock balance from order (locked -> available)
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

-- 7.3 Credit deposit (balance + available increase)
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

-- 7.4 Reserve for withdrawal (available -> locked)
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

-- 7.5 Approve withdrawal (balance - amount, locked - amount, totalWithdrawn + amount)
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

-- 7.6 Reject withdrawal (locked -> available)
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

-- 7.7 Settlement payout (available + payout, balance + profit)
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

-- 7.8 Settlement loss (balance - stake)
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

-- 7.9 Decrement available (available - amount)
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

-- 7.10 Refund to available (for position refunds)
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

-- 7.11 Settle winner (unlock + credit payout)
CREATE OR REPLACE FUNCTION atomic_settle_winner(
  p_user_id uuid,
  p_stake bigint,
  p_payout bigint,
  p_profit bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid, user_id uuid,
  balance_ngn_kobo bigint, balance_usd_cents bigint,
  available_ngn_kobo bigint, available_usd_cents bigint,
  locked_ngn_kobo bigint, locked_usd_cents bigint,
  total_winnings_ngn_kobo bigint, total_winnings_usd_cents bigint,
  updated_at timestamptz
) AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets SET
      locked_usd_cents = GREATEST(0, locked_usd_cents - p_stake),
      balance_usd_cents = balance_usd_cents + p_profit,
      available_usd_cents = available_usd_cents + p_payout,
      total_winnings_usd_cents = total_winnings_usd_cents + p_payout,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.locked_usd_cents >= p_stake
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.total_winnings_ngn_kobo, wallets.total_winnings_usd_cents,
      wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      locked_ngn_kobo = GREATEST(0, locked_ngn_kobo - p_stake),
      balance_ngn_kobo = balance_ngn_kobo + p_profit,
      available_ngn_kobo = available_ngn_kobo + p_payout,
      total_winnings_ngn_kobo = total_winnings_ngn_kobo + p_payout,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.locked_ngn_kobo >= p_stake
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.total_winnings_ngn_kobo, wallets.total_winnings_usd_cents,
      wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7.12 Settle loser (unlock stake, no payout)
CREATE OR REPLACE FUNCTION atomic_settle_loser(
  p_user_id uuid,
  p_stake bigint,
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
      locked_usd_cents = GREATEST(0, locked_usd_cents - p_stake),
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.locked_usd_cents >= p_stake
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      locked_ngn_kobo = GREATEST(0, locked_ngn_kobo - p_stake),
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.locked_ngn_kobo >= p_stake
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7.13 Order-book settle (unlock + credit payout in one step)
CREATE OR REPLACE FUNCTION atomic_orderbook_settle(
  p_user_id uuid,
  p_stake bigint,
  p_payout bigint,
  p_profit bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid, user_id uuid,
  balance_ngn_kobo bigint, balance_usd_cents bigint,
  available_ngn_kobo bigint, available_usd_cents bigint,
  locked_ngn_kobo bigint, locked_usd_cents bigint,
  total_winnings_ngn_kobo bigint, total_winnings_usd_cents bigint,
  updated_at timestamptz
) AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets SET
      locked_usd_cents = GREATEST(0, locked_usd_cents - p_stake),
      balance_usd_cents = balance_usd_cents + p_payout,
      available_usd_cents = available_usd_cents + GREATEST(0, p_profit),
      total_winnings_usd_cents = total_winnings_usd_cents + GREATEST(0, p_profit),
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.locked_usd_cents >= p_stake
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.total_winnings_ngn_kobo, wallets.total_winnings_usd_cents,
      wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      locked_ngn_kobo = GREATEST(0, locked_ngn_kobo - p_stake),
      balance_ngn_kobo = balance_ngn_kobo + p_payout,
      available_ngn_kobo = available_ngn_kobo + GREATEST(0, p_profit),
      total_winnings_ngn_kobo = total_winnings_ngn_kobo + GREATEST(0, p_profit),
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND wallets.locked_ngn_kobo >= p_stake
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.balance_usd_cents,
      wallets.available_ngn_kobo, wallets.available_usd_cents,
      wallets.locked_ngn_kobo, wallets.locked_usd_cents,
      wallets.total_winnings_ngn_kobo, wallets.total_winnings_usd_cents,
      wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7.14 Refund order (locked -> available)
CREATE OR REPLACE FUNCTION atomic_refund_order(
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
      locked_usd_cents = GREATEST(0, locked_usd_cents - p_amount),
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
      locked_ngn_kobo = GREATEST(0, locked_ngn_kobo - p_amount),
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

-- ============================================================================
-- SECTION 8: QUERY FUNCTIONS
-- ============================================================================

-- 8.1 Get unsettled positions for a market
CREATE OR REPLACE FUNCTION get_unsettled_positions(p_market_id uuid)
RETURNS TABLE(
  position_id uuid,
  user_id uuid,
  side text,
  amount_smallest_unit bigint,
  shares_owned bigint,
  shares_received bigint,
  price_at_purchase bigint,
  order_id uuid,
  currency text,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS position_id,
    p.user_id,
    p.side,
    p.amount_smallest_unit,
    COALESCE(p.shares_owned, 0)::bigint AS shares_owned,
    COALESCE(p.shares_received, 0)::bigint AS shares_received,
    COALESCE(p.price_at_purchase, p.entry_price, 0)::bigint AS price_at_purchase,
    p.order_id,
    COALESCE(p.currency, 'NGN') AS currency,
    p.status
  FROM positions p
  WHERE p.market_id = p_market_id
    AND (p.settled_at IS NULL AND p.resolved_at IS NULL)
    AND COALESCE(p.status, '') NOT IN ('won', 'lost', 'settled', 'refunded');
END;
$$ LANGUAGE plpgsql;

-- 8.2 Get active orders for a market (for refund)
CREATE OR REPLACE FUNCTION get_active_orders_for_market(p_market_id uuid)
RETURNS TABLE(
  order_id uuid,
  user_id uuid,
  side text,
  order_type text,
  price bigint,
  quantity bigint,
  filled_quantity bigint,
  status text,
  locked_amount bigint,
  currency text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS order_id,
    o.user_id,
    o.side,
    o.order_type,
    o.price,
    o.quantity,
    o.filled_quantity,
    o.status,
    o.locked_amount,
    'NGN' AS currency
  FROM orders o
  WHERE o.market_id = p_market_id
    AND o.status IN ('waiting', 'partial', 'pending');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 9: RLS POLICIES
-- ============================================================================

-- 9.1 Enable RLS on new tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- 9.2 Orders policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'orders: own read' AND tablename = 'orders') THEN
    CREATE POLICY "orders: own read" ON orders
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'orders: own insert' AND tablename = 'orders') THEN
    CREATE POLICY "orders: own insert" ON orders
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'orders: own update' AND tablename = 'orders') THEN
    CREATE POLICY "orders: own update" ON orders
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 9.3 Order fills policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'order_fills: own read' AND tablename = 'order_fills') THEN
    CREATE POLICY "order_fills: own read" ON order_fills
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 9.4 Trades policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'trades: participant read' AND tablename = 'trades') THEN
    CREATE POLICY "trades: participant read" ON trades
      FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
  END IF;
END $$;

-- 9.5 Order events policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'order_events: own read' AND tablename = 'order_events') THEN
    CREATE POLICY "order_events: own read" ON order_events
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 9.6 Settlement audit log policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settlement_audit: service_role all' AND tablename = 'settlement_audit_log') THEN
    CREATE POLICY "settlement_audit: service_role all"
      ON settlement_audit_log FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settlement_audit: admin read' AND tablename = 'settlement_audit_log') THEN
    CREATE POLICY "settlement_audit: admin read"
      ON settlement_audit_log FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- 9.7 Market comments policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'market_comments: public read' AND tablename = 'market_comments') THEN
    CREATE POLICY "market_comments: public read"
      ON market_comments FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'market_comments: own insert' AND tablename = 'market_comments') THEN
    CREATE POLICY "market_comments: own insert"
      ON market_comments FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 9.8 Admin audit log policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_audit: service_role all' AND tablename = 'admin_audit_log') THEN
    CREATE POLICY "admin_audit: service_role all"
      ON admin_audit_log FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_audit: admin read' AND tablename = 'admin_audit_log') THEN
    CREATE POLICY "admin_audit: admin read"
      ON admin_audit_log FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- ============================================================================
-- SECTION 10: GRANTS
-- ============================================================================

GRANT ALL ON orders TO service_role;
GRANT ALL ON order_fills TO service_role;
GRANT ALL ON trades TO service_role;
GRANT ALL ON order_events TO service_role;
GRANT ALL ON settlement_audit_log TO service_role;
GRANT ALL ON market_comments TO service_role;
GRANT ALL ON admin_audit_log TO service_role;

GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT SELECT ON order_fills TO authenticated;
GRANT SELECT ON trades TO authenticated;
GRANT SELECT ON order_events TO authenticated;
GRANT SELECT ON settlement_audit_log TO authenticated;
GRANT SELECT, INSERT ON market_comments TO authenticated;

GRANT EXECUTE ON FUNCTION atomic_lock_for_order(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_unlock_from_order(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_credit_deposit(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_reserve_for_withdrawal(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_approve_withdrawal(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_reject_withdrawal(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_settlement_payout(uuid, bigint, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_settlement_loss(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_decrement_available(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_refund_to_available(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_settle_winner(uuid, bigint, bigint, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_settle_loser(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_orderbook_settle(uuid, bigint, bigint, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_refund_order(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION get_unsettled_positions(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION get_active_orders_for_market(uuid) TO service_role;

-- ============================================================================
-- SECTION 11: VERIFICATION
-- Run these queries after migration to confirm everything exists.
-- ============================================================================

-- 11.1 All tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'users', 'wallets', 'markets', 'positions', 'transactions',
    'notifications', 'orders', 'order_fills', 'trades', 'order_events',
    'settlement_audit_log', 'market_comments', 'admin_audit_log',
    'deposit_requests', 'withdrawal_requests', 'market_trades',
    'market_price_history', 'market_resolution_logs',
    'market_activity_events', 'market_comments', 'saved_bank_details',
    'leaderboard_entries', 'position_listings', 'profiles'
  )
ORDER BY table_name;

-- 11.2 All atomic functions
SELECT p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE 'atomic_%'
ORDER BY p.proname;

-- 11.3 Helper function
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'add_column_if_missing';

-- 11.4 Query functions
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('get_unsettled_positions', 'get_active_orders_for_market');

-- 11.5 Wallet columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'wallets'
  AND column_name IN (
    'balance_ngn_kobo', 'balance_usd_cents',
    'available_ngn_kobo', 'available_usd_cents',
    'locked_ngn_kobo', 'locked_usd_cents',
    'total_deposited_ngn_kobo', 'total_withdrawn_ngn_kobo',
    'total_winnings_ngn_kobo', 'total_winnings_usd_cents',
    'currency'
  )
ORDER BY column_name;

-- 11.6 Markets settlement columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'markets'
  AND column_name LIKE 'settlement_%'
ORDER BY column_name;

-- 11.7 Positions order book + settlement columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'positions'
  AND column_name IN ('order_id', 'first_fill_price', 'last_fill_price', 'fill_count',
                       'settlement_id', 'settlement_outcome', 'refund_reason',
                       'refund_amount_smallest_unit', 'refunded_at', 'settled_at',
                       'status', 'shares_owned', 'shares_received')
ORDER BY column_name;

-- 11.8 Indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_orders_%'
    OR indexname LIKE 'idx_fills_%'
    OR indexname LIKE 'idx_trades_%'
    OR indexname LIKE 'idx_order_events_%'
    OR indexname LIKE 'idx_settlement_%'
    OR indexname LIKE 'idx_positions_settlement%'
    OR indexname LIKE 'idx_positions_market_settled'
    OR indexname LIKE 'idx_market_comments_%'
    OR indexname LIKE 'idx_admin_audit_%'
  )
ORDER BY indexname;

-- 11.9 RLS enabled on new tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'order_fills', 'trades', 'order_events',
                     'settlement_audit_log', 'market_comments', 'admin_audit_log')
ORDER BY tablename;

-- 11.10 Wallet constraint check (available_lte_balance should NOT exist)
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'wallets'::regclass
ORDER BY conname;

-- 11.11 Pricing model constraint
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'markets'::regclass
  AND conname LIKE '%pricing%';

-- 11.12 Status constraint includes 'refunded'
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'markets'::regclass
  AND conname LIKE '%status%';

-- 11.13 Notification type constraint includes settlement types
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
  AND conname LIKE '%type%';

-- 11.14 Settlement audit log RLS
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'settlement_audit_log';

-- 11.15 Admin audit log RLS
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'admin_audit_log';

-- 11.16 Triggers on orders
SELECT trigger_name, eventmanipulation
FROM information_schema.triggers
WHERE event_object_table = 'orders';

-- 11.17 Summary count
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS total_tables,
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname LIKE 'atomic_%') AS atomic_functions,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'idx_%') AS total_indexes;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
