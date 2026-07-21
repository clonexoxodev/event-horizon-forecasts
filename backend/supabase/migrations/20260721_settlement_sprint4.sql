-- ============================================================================
-- FLIPPE SETTLEMENT ENGINE — SPRINT 4 MIGRATION
-- Version: 1.0
-- Date: 2026-07-21
--
-- This migration:
--   1. Adds settlement lifecycle columns to markets
--   2. Adds settlement tracking to positions
--   3. Creates settlement_audit_log table
--   4. Creates atomic settlement RPC functions
--   5. Creates order-book position creation function
--   6. Creates refund-all-orders function
--   7. Adds settlement indexes
--
-- ROLLBACK: Run the rollback section at the bottom of this file.
-- ============================================================================

-- ============================================================================
-- SECTION 1: SETTLEMENT LIFECYCLE COLUMNS ON MARKETS
-- ============================================================================

SELECT add_column_if_missing('markets', 'settlement_status', 'text', $$'idle'$$);
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_settlement_status_check;
ALTER TABLE markets ADD CONSTRAINT markets_settlement_status_check
  CHECK (settlement_status IN ('idle', 'pending', 'settling', 'completed', 'failed', 'refunding', 'refunded', 'cancelled'));

SELECT add_column_if_missing('markets', 'settlement_started_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'settlement_completed_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'settlement_error', 'text');
SELECT add_column_if_missing('markets', 'settlement_log', 'jsonb', $$'[]'::jsonb$$);
SELECT add_column_if_missing('markets', 'total_settled_positions', 'integer', '0');
SELECT add_column_if_missing('markets', 'total_settled_payout_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('markets', 'total_refunded_smallest_unit', 'bigint', '0');

-- ============================================================================
-- SECTION 2: SETTLEMENT TRACKING ON POSITIONS
-- ============================================================================

SELECT add_column_if_missing('positions', 'settlement_id', 'text');
SELECT add_column_if_missing('positions', 'settlement_outcome', 'text');
SELECT add_column_if_missing('positions', 'refund_reason', 'text');
SELECT add_column_if_missing('positions', 'refund_amount_smallest_unit', 'bigint', '0');
SELECT add_column_if_missing('positions', 'refunded_at', 'timestamptz');

-- Idempotency: prevent double-settling a position
CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_settlement_id
  ON positions(settlement_id)
  WHERE settlement_id IS NOT NULL;

-- ============================================================================
-- SECTION 3: SETTLEMENT AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS settlement_audit_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id         text NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_settlement_audit_market
  ON settlement_audit_log(market_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_settlement_audit_admin
  ON settlement_audit_log(admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_settlement_audit_action
  ON settlement_audit_log(action_type);

CREATE INDEX IF NOT EXISTS idx_settlement_audit_user
  ON settlement_audit_log(user_id);

-- ============================================================================
-- SECTION 4: ATOMIC SETTLEMENT RPC FUNCTIONS
-- ============================================================================

-- 4.1 Settle a winning position (unlock + credit payout)
CREATE OR REPLACE FUNCTION atomic_settle_winner(
  p_user_id uuid,
  p_stake bigint,
  p_payout bigint,
  p_profit bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  available_ngn_kobo bigint,
  locked_ngn_kobo bigint,
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
      AND locked_usd_cents >= p_stake
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.available_ngn_kobo,
      wallets.locked_ngn_kobo, wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      locked_ngn_kobo = GREATEST(0, locked_ngn_kobo - p_stake),
      balance_ngn_kobo = balance_ngn_kobo + p_profit,
      available_ngn_kobo = available_ngn_kobo + p_payout,
      total_winnings_ngn_kobo = total_winnings_ngn_kobo + p_payout,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND locked_ngn_kobo >= p_stake
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.available_ngn_kobo,
      wallets.locked_ngn_kobo, wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Settle a losing position (unlock stake, no payout)
CREATE OR REPLACE FUNCTION atomic_settle_loser(
  p_user_id uuid,
  p_stake bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  available_ngn_kobo bigint,
  locked_ngn_kobo bigint,
  updated_at timestamptz
) AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets SET
      locked_usd_cents = GREATEST(0, locked_usd_cents - p_stake),
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND locked_usd_cents >= p_stake
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.available_ngn_kobo,
      wallets.locked_ngn_kobo, wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      locked_ngn_kobo = GREATEST(0, locked_ngn_kobo - p_stake),
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND locked_ngn_kobo >= p_stake
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.available_ngn_kobo,
      wallets.locked_ngn_kobo, wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4.3 Refund an order-book order (unlock remaining locked balance)
CREATE OR REPLACE FUNCTION atomic_refund_order(
  p_user_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  available_ngn_kobo bigint,
  locked_ngn_kobo bigint,
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
      AND locked_usd_cents >= p_amount
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.available_ngn_kobo,
      wallets.locked_ngn_kobo, wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      locked_ngn_kobo = GREATEST(0, locked_ngn_kobo - p_amount),
      available_ngn_kobo = available_ngn_kobo + p_amount,
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND locked_ngn_kobo >= p_amount
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.available_ngn_kobo,
      wallets.locked_ngn_kobo, wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4.4 Atomic settlement for order-book position: unlock stake + credit payout in one step
CREATE OR REPLACE FUNCTION atomic_orderbook_settle(
  p_user_id uuid,
  p_stake bigint,
  p_payout bigint,
  p_profit bigint,
  p_currency text DEFAULT 'NGN'
) RETURNS TABLE(
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  available_ngn_kobo bigint,
  locked_ngn_kobo bigint,
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
      AND locked_usd_cents >= p_stake
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.available_ngn_kobo,
      wallets.locked_ngn_kobo, wallets.updated_at;
  ELSE
    RETURN QUERY
    UPDATE wallets SET
      locked_ngn_kobo = GREATEST(0, locked_ngn_kobo - p_stake),
      balance_ngn_kobo = balance_ngn_kobo + p_payout,
      available_ngn_kobo = available_ngn_kobo + GREATEST(0, p_profit),
      total_winnings_ngn_kobo = total_winnings_ngn_kobo + GREATEST(0, p_profit),
      updated_at = now()
    WHERE wallets.user_id = p_user_id
      AND locked_ngn_kobo >= p_stake
    RETURNING
      wallets.id, wallets.user_id,
      wallets.balance_ngn_kobo, wallets.available_ngn_kobo,
      wallets.locked_ngn_kobo, wallets.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 5: BATCH SETTLEMENT FUNCTION
-- ============================================================================

-- 5.1 Get all unsettled positions for a market
CREATE OR REPLACE FUNCTION get_unsettled_positions(p_market_id text)
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
    p.shares_owned,
    p.shares_received,
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

-- 5.2 Get all active orders for a market (for refund)
CREATE OR REPLACE FUNCTION get_active_orders_for_market(p_market_id text)
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
-- SECTION 6: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_positions_market_settled
  ON positions(market_id, settled_at)
  WHERE settled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_positions_settlement_outcome
  ON positions(settlement_outcome);

CREATE INDEX IF NOT EXISTS idx_orders_market_active
  ON orders(market_id, status)
  WHERE status IN ('waiting', 'partial', 'pending');

CREATE INDEX IF NOT EXISTS idx_settlement_audit_created
  ON settlement_audit_log(created_at DESC);

-- ============================================================================
-- SECTION 7: GRANTS
-- ============================================================================

GRANT ALL ON settlement_audit_log TO service_role;
GRANT SELECT ON settlement_audit_log TO authenticated;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- To rollback this migration, run:
--
-- DROP FUNCTION IF EXISTS get_active_orders_for_market(text);
-- DROP FUNCTION IF EXISTS get_unsettled_positions(text);
-- DROP FUNCTION IF EXISTS atomic_orderbook_settle(uuid, bigint, bigint, bigint, text);
-- DROP FUNCTION IF EXISTS atomic_refund_order(uuid, bigint, text);
-- DROP FUNCTION IF EXISTS atomic_settle_loser(uuid, bigint, text);
-- DROP FUNCTION IF EXISTS atomic_settle_winner(uuid, bigint, bigint, bigint, text);
-- DROP INDEX IF EXISTS idx_settlement_audit_created;
-- DROP INDEX IF EXISTS idx_orders_market_active;
-- DROP INDEX IF EXISTS idx_positions_settlement_outcome;
-- DROP INDEX IF EXISTS idx_positions_market_settled;
-- DROP INDEX IF EXISTS idx_settlement_audit_user;
-- DROP INDEX IF EXISTS idx_settlement_audit_action;
-- DROP INDEX IF EXISTS idx_settlement_audit_admin;
-- DROP INDEX IF EXISTS idx_settlement_audit_market;
-- DROP TABLE IF EXISTS settlement_audit_log;
-- DROP INDEX IF EXISTS idx_positions_settlement_id;
-- ALTER TABLE positions DROP COLUMN IF EXISTS refunded_at;
-- ALTER TABLE positions DROP COLUMN IF EXISTS refund_amount_smallest_unit;
-- ALTER TABLE positions DROP COLUMN IF EXISTS refund_reason;
-- ALTER TABLE positions DROP COLUMN IF EXISTS settlement_outcome;
-- ALTER TABLE positions DROP COLUMN IF EXISTS settlement_id;
-- ALTER TABLE markets DROP COLUMN IF EXISTS total_refunded_smallest_unit;
-- ALTER TABLE markets DROP COLUMN IF EXISTS total_settled_payout_smallest_unit;
-- ALTER TABLE markets DROP COLUMN IF EXISTS total_settled_positions;
-- ALTER TABLE markets DROP COLUMN IF EXISTS settlement_log;
-- ALTER TABLE markets DROP COLUMN IF EXISTS settlement_error;
-- ALTER TABLE markets DROP COLUMN IF EXISTS settlement_completed_at;
-- ALTER TABLE markets DROP COLUMN IF EXISTS settlement_started_at;
-- ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_settlement_status_check;
-- ALTER TABLE markets DROP COLUMN IF EXISTS settlement_status;
