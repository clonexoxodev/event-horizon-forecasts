-- ============================================================================
-- FLIPPE ORDER BOOK — SPRINT 1 MIGRATION
-- Version: 1.0
-- Date: 2026-07-21
-- 
-- This migration:
--   1. Creates new tables: orders, order_fills, trades, order_events
--   2. Adds order book columns to markets table
--   3. Adds order references to positions table
--   4. Adds new transaction types
--   5. Creates atomic wallet operation functions
--   6. Adds all required indexes and constraints
--
-- ROLLBACK: Run the rollback section at the bottom of this file.
-- ============================================================================

-- ============================================================================
-- SECTION 1: HELPER FUNCTION (used by idempotent column adds)
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
-- SECTION 2: NEW TABLES
-- ============================================================================

-- 2.1 Orders table
CREATE TABLE IF NOT EXISTS orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id         text NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,

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

-- 2.2 Order fills table
CREATE TABLE IF NOT EXISTS order_fills (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id          uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id         text NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,

  side              text NOT NULL CHECK (side IN ('YES', 'NO')),
  order_type        text NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
  fill_price        bigint NOT NULL CHECK (fill_price > 0 AND fill_price < 100),
  fill_quantity     bigint NOT NULL CHECK (fill_quantity > 0),

  matched_order_id  uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  matched_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  position_id       uuid,

  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 2.3 Trades table
CREATE TABLE IF NOT EXISTS trades (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id         text NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,

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

-- 2.4 Order events table (audit trail)
CREATE TABLE IF NOT EXISTS order_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  market_id         text NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
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

-- ============================================================================
-- SECTION 3: INDEXES ON NEW TABLES
-- ============================================================================

-- Orders: matching queue (partial index for active orders only)
CREATE INDEX IF NOT EXISTS idx_orders_match_queue
  ON orders(market_id, status, side, price DESC, created_at ASC)
  WHERE status IN ('waiting', 'partial');

-- Orders: book depth display
CREATE INDEX IF NOT EXISTS idx_orders_book_depth
  ON orders(market_id, status, side, price DESC, created_at ASC)
  WHERE status IN ('waiting', 'partial');

-- Orders: user's orders
CREATE INDEX IF NOT EXISTS idx_orders_user
  ON orders(user_id, status);

-- Orders: market lookup
CREATE INDEX IF NOT EXISTS idx_orders_market
  ON orders(market_id, status);

-- Orders: created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders(created_at);

-- Idempotency: prevent duplicate orders (partial — only enforces non-null keys)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency
  ON orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Fills: order lookup
CREATE INDEX IF NOT EXISTS idx_fills_order
  ON order_fills(order_id);

-- Fills: market + time
CREATE INDEX IF NOT EXISTS idx_fills_market
  ON order_fills(market_id, created_at DESC);

-- Fills: user + market
CREATE INDEX IF NOT EXISTS idx_fills_user
  ON order_fills(user_id, market_id);

-- Trades: market + time
CREATE INDEX IF NOT EXISTS idx_trades_market
  ON trades(market_id, created_at DESC);

-- Trades: buy order
CREATE INDEX IF NOT EXISTS idx_trades_buy_order
  ON trades(buy_order_id);

-- Trades: sell order
CREATE INDEX IF NOT EXISTS idx_trades_sell_order
  ON trades(sell_order_id);

-- Events: order lookup
CREATE INDEX IF NOT EXISTS idx_order_events_order
  ON order_events(order_id);

-- Events: market + time
CREATE INDEX IF NOT EXISTS idx_order_events_market
  ON order_events(market_id, created_at DESC);

-- Events: user
CREATE INDEX IF NOT EXISTS idx_order_events_user
  ON order_events(user_id);

-- Events: event type
CREATE INDEX IF NOT EXISTS idx_order_events_type
  ON order_events(event_type);

-- ============================================================================
-- SECTION 4: ADD COLUMNS TO EXISTING TABLES
-- ============================================================================

-- 4.1 Markets: order book columns
SELECT add_column_if_missing('markets', 'pricing_model', 'text', $$'orderbook'$$);
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_pricing_model_check;
ALTER TABLE markets ADD CONSTRAINT markets_pricing_model_check
  CHECK (pricing_model IN ('pool', 'orderbook'));

SELECT add_column_if_missing('markets', 'best_bid_price', 'bigint');
SELECT add_column_if_missing('markets', 'best_ask_price', 'bigint');
SELECT add_column_if_missing('markets', 'last_trade_price', 'bigint');
SELECT add_column_if_missing('markets', 'last_trade_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'total_orders_count', 'integer', '0');
SELECT add_column_if_missing('markets', 'matched_volume_smallest_unit', 'bigint', '0');

-- Exposure limits
SELECT add_column_if_missing('markets', 'max_exposure_per_user', 'bigint', '100000000');
SELECT add_column_if_missing('markets', 'max_exposure_per_side', 'bigint', '500000000');
SELECT add_column_if_missing('markets', 'max_imbalance_ratio', 'numeric', '3.0');
SELECT add_column_if_missing('markets', 'max_order_size', 'bigint', '50000000');
SELECT add_column_if_missing('markets', 'max_daily_exposure', 'bigint', '200000000');

-- 4.2 Positions: order references
SELECT add_column_if_missing('positions', 'order_id', 'uuid');
SELECT add_column_if_missing('positions', 'first_fill_price', 'bigint');
SELECT add_column_if_missing('positions', 'last_fill_price', 'bigint');
SELECT add_column_if_missing('positions', 'fill_count', 'integer', '0');

-- Add foreign key for positions.order_id if not exists
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

-- Add foreign key for order_fills.position_id if not exists
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
-- SECTION 5: ATOMIC WALLET OPERATIONS
-- ============================================================================

-- 5.1 Lock balance for order (available → locked)
CREATE OR REPLACE FUNCTION atomic_lock_for_order(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
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

-- 5.2 Unlock balance from order (locked → available)
CREATE OR REPLACE FUNCTION atomic_unlock_from_order(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
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

-- 5.3 Credit deposit (balance + available increase)
CREATE OR REPLACE FUNCTION atomic_credit_deposit(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  updated_at timestamptz
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

-- 5.4 Withdrawal request (available → locked)
CREATE OR REPLACE FUNCTION atomic_reserve_for_withdrawal(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
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

-- 5.5 Withdrawal approve (balance - amount, locked - amount, totalWithdrawn + amount)
CREATE OR REPLACE FUNCTION atomic_approve_withdrawal(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_withdrawn_ngn_kobo bigint,
  updated_at timestamptz
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

-- 5.6 Withdrawal reject (locked → available)
CREATE OR REPLACE FUNCTION atomic_reject_withdrawal(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
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

-- 5.7 Settlement payout (winner: available + payout, balance + profit)
CREATE OR REPLACE FUNCTION atomic_settlement_payout(
  p_user_id uuid,
  p_payout bigint,
  p_profit bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_winnings_ngn_kobo bigint,
  updated_at timestamptz
) AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets SET
      available_usd_cents = available_usd_cents + p_payout,
      balance_usd_cents = balance_usd_cents + GREATEST(0, p_profit),
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

-- 5.8 Settlement loss (balance - stake)
CREATE OR REPLACE FUNCTION atomic_settlement_loss(
  p_user_id uuid,
  p_stake bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
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

-- 5.9 Position entry (available → locked for pool markets, available → consumed for order book)
CREATE OR REPLACE FUNCTION atomic_decrement_available(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
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

-- 5.10 Refund to available (for position refunds)
CREATE OR REPLACE FUNCTION atomic_refund_to_available(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
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

-- ============================================================================
-- SECTION 6: RLS POLICIES (Orders, Fills, Trades, Events)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

-- Orders: users can read their own, service role can do everything
CREATE POLICY "orders: own read" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "orders: own insert" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders: own update" ON orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Order fills: users can read their own
CREATE POLICY "order_fills: own read" ON order_fills
  FOR SELECT USING (auth.uid() = user_id);

-- Trades: users can read trades they're part of
CREATE POLICY "trades: participant read" ON trades
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Order events: users can read their own order events
CREATE POLICY "order_events: own read" ON order_events
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 7: TRIGGERS
-- ============================================================================

-- Auto-update updated_at on orders
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

-- ============================================================================
-- SECTION 8: GRANTS (for service role access)
-- ============================================================================

GRANT ALL ON orders TO service_role;
GRANT ALL ON order_fills TO service_role;
GRANT ALL ON trades TO service_role;
GRANT ALL ON order_events TO service_role;

GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT SELECT ON order_fills TO authenticated;
GRANT SELECT ON trades TO authenticated;
GRANT SELECT ON order_events TO authenticated;

-- Grant execute on atomic functions to service_role
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

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


-- ============================================================================
-- ROLLBACK SCRIPT (run this to undo the migration)
-- ============================================================================
-- 
-- DROP FUNCTION IF EXISTS atomic_refund_to_available(uuid, bigint, text);
-- DROP FUNCTION IF EXISTS atomic_decrement_available(uuid, bigint, text);
-- DROP FUNCTION IF EXISTS atomic_settlement_loss(uuid, bigint, text);
-- DROP FUNCTION IF EXISTS atomic_settlement_payout(uuid, bigint, bigint, text);
-- DROP FUNCTION IF EXISTS atomic_reject_withdrawal(uuid, bigint, text);
-- DROP FUNCTION IF EXISTS atomic_approve_withdrawal(uuid, bigint, text);
-- DROP FUNCTION IF EXISTS atomic_reserve_for_withdrawal(uuid, bigint, text);
-- DROP FUNCTION IF EXISTS atomic_credit_deposit(uuid, bigint, text);
-- DROP FUNCTION IF EXISTS atomic_unlock_from_order(uuid, bigint, text);
-- DROP FUNCTION IF EXISTS atomic_lock_for_order(uuid, bigint, text);
-- DROP FUNCTION IF EXISTS update_orders_updated_at;
-- DROP FUNCTION IF EXISTS add_column_if_missing(text, text, text, text);
-- DROP TABLE IF EXISTS order_events CASCADE;
-- DROP TABLE IF EXISTS trades CASCADE;
-- DROP TABLE IF EXISTS order_fills CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- ALTER TABLE positions DROP COLUMN IF EXISTS order_id;
-- ALTER TABLE positions DROP COLUMN IF EXISTS first_fill_price;
-- ALTER TABLE positions DROP COLUMN IF EXISTS last_fill_price;
-- ALTER TABLE positions DROP COLUMN IF EXISTS fill_count;
-- ALTER TABLE markets DROP COLUMN IF EXISTS pricing_model;
-- ALTER TABLE markets DROP COLUMN IF EXISTS best_bid_price;
-- ALTER TABLE markets DROP COLUMN IF EXISTS best_ask_price;
-- ALTER TABLE markets DROP COLUMN IF EXISTS last_trade_price;
-- ALTER TABLE markets DROP COLUMN IF EXISTS last_trade_at;
-- ALTER TABLE markets DROP COLUMN IF EXISTS total_orders_count;
-- ALTER TABLE markets DROP COLUMN IF EXISTS matched_volume_smallest_unit;
-- ALTER TABLE markets DROP COLUMN IF EXISTS max_exposure_per_user;
-- ALTER TABLE markets DROP COLUMN IF EXISTS max_exposure_per_side;
-- ALTER TABLE markets DROP COLUMN IF EXISTS max_imbalance_ratio;
-- ALTER TABLE markets DROP COLUMN IF EXISTS max_order_size;
-- ALTER TABLE markets DROP COLUMN IF EXISTS max_daily_exposure;
