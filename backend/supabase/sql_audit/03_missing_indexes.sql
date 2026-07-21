-- ============================================================================
-- FLIPPE AUDIT: 03 MISSING INDEXES
-- Indexes required by code queries that are NOT in existing migrations.
-- Run AFTER 01_missing_tables.sql and 02_missing_columns.sql.
-- ============================================================================

-- ============================================================================
-- positions
-- ============================================================================

-- Dashboard filters positions where settled_at IS NULL to find open claims
CREATE INDEX IF NOT EXISTS idx_positions_settled_at
  ON positions(settled_at);

-- Settlement service filters by position status
CREATE INDEX IF NOT EXISTS idx_positions_status
  ON positions(status);

-- Order service links positions to their originating orders
CREATE INDEX IF NOT EXISTS idx_positions_order_id
  ON positions(order_id)
  WHERE order_id IS NOT NULL;

-- ============================================================================
-- notifications
-- ============================================================================

-- Code queries notifications by reference_id and reference_type
-- (e.g. look up notification for a specific order or position)
CREATE INDEX IF NOT EXISTS idx_notifications_reference
  ON notifications(reference_id, reference_type)
  WHERE reference_id IS NOT NULL;

-- ============================================================================
-- transactions
-- ============================================================================

-- Settlement checks for existing refund transactions by position_id
CREATE INDEX IF NOT EXISTS idx_transactions_position_id
  ON transactions(position_id)
  WHERE position_id IS NOT NULL;

-- ============================================================================
-- wallets
-- ============================================================================

-- Unique index on user_id for fast wallet lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_user_id_unique
  ON wallets(user_id);

-- ============================================================================
-- markets
-- ============================================================================

-- Filtering markets by pricing_model (order book vs pool)
CREATE INDEX IF NOT EXISTS idx_markets_pricing_model
  ON markets(pricing_model)
  WHERE pricing_model IS NOT NULL;

-- Admin dashboard filters by settlement state
CREATE INDEX IF NOT EXISTS idx_markets_settlement_status
  ON markets(settlement_status)
  WHERE settlement_status IS NOT NULL AND settlement_status != 'idle';
