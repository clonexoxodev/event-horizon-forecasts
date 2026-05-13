-- Migration: Add additional performance indexes
-- Created: 2024-01-15
-- Description: Add indexes for improved query performance on common access patterns

-- UP Migration

-- Additional indexes for markets table
CREATE INDEX IF NOT EXISTS idx_markets_currency ON markets(currency);
CREATE INDEX IF NOT EXISTS idx_markets_state_closes_at ON markets(state, closes_at);

-- Additional indexes for positions table
CREATE INDEX IF NOT EXISTS idx_positions_side ON positions(side);
CREATE INDEX IF NOT EXISTS idx_positions_currency ON positions(currency);
CREATE INDEX IF NOT EXISTS idx_positions_is_winner ON positions(is_winner) WHERE is_winner IS NOT NULL;

-- Additional indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);

-- Additional indexes for leaderboard table
CREATE INDEX IF NOT EXISTS idx_leaderboard_accuracy ON leaderboard_entries(accuracy_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_predictions ON leaderboard_entries(total_predictions DESC);

-- Additional indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_positions_user_created ON positions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_state_created ON markets(state, created_at DESC);

-- DOWN Migration (for rollback)
-- DROP INDEX IF EXISTS idx_markets_currency;
-- DROP INDEX IF EXISTS idx_markets_state_closes_at;
-- DROP INDEX IF EXISTS idx_positions_side;
-- DROP INDEX IF EXISTS idx_positions_currency;
-- DROP INDEX IF EXISTS idx_positions_is_winner;
-- DROP INDEX IF EXISTS idx_transactions_type;
-- DROP INDEX IF EXISTS idx_transactions_status;
-- DROP INDEX IF EXISTS idx_transactions_user_type;
-- DROP INDEX IF EXISTS idx_leaderboard_accuracy;
-- DROP INDEX IF EXISTS idx_leaderboard_total_predictions;
-- DROP INDEX IF EXISTS idx_notifications_type;
-- DROP INDEX IF EXISTS idx_notifications_user_unread;
-- DROP INDEX IF EXISTS idx_positions_user_created;
-- DROP INDEX IF EXISTS idx_transactions_user_created;
-- DROP INDEX IF EXISTS idx_markets_state_created;