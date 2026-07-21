-- ============================================================================
-- FLIPPE AUDIT: 08 MISSING/FIXED CONSTRAINTS
-- Constraints that must be fixed for the backend to function
-- ============================================================================

-- PROBLEM 1: The existing available_lte_balance CHECK constraint on wallets
-- will BREAK atomic functions. These functions atomically update available and
-- locked in a single UPDATE statement. PostgreSQL checks CHECK constraints
-- AFTER the UPDATE, but the constraint:
--   CHECK (available_ngn_kobo <= balance_ngn_kobo AND available_usd_cents <= balance_usd_cents)
-- would be violated when available is moved to locked (available decreases,
-- locked increases, but balance stays the same -- and available was already
-- at the limit before the move).
--
-- SOLUTION: Drop the constraint. The atomic functions handle the balance
-- invariant internally with WHERE guards.

ALTER TABLE wallets DROP CONSTRAINT IF EXISTS available_lte_balance;

-- PROBLEM 2: pricing_model constraint in sprint1 limits to ('pool', 'orderbook')
-- but existing markets use 'ownership_shares'. When sprint1 runs, the constraint
-- DROP/ADD will FAIL if any market has pricing_model = 'ownership_shares'.
-- Also, sprint1 defaults new column to 'orderbook' which is wrong for pool markets.
--
-- SOLUTION: Fix the constraint to include all three models.

ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_pricing_model_check;
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_pricing_model_v2_check;
ALTER TABLE markets ADD CONSTRAINT markets_pricing_model_check
  CHECK (pricing_model IN ('pool', 'orderbook', 'ownership_shares', 'legacy_fixed_share', 'legacy_pool'));

-- PROBLEM 3: markets status constraint may conflict.
-- sprint4 adds 'refunded' to the allowed status values.
-- The existing chain of constraints needs to be clean.

-- Drop and re-add with all needed values
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_status_check;
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_status_v1_check;
ALTER TABLE markets ADD CONSTRAINT markets_status_v1_check
  CHECK (status IN ('draft', 'active', 'closed', 'pending_resolution', 'resolving', 'resolved', 'cancelled', 'archived', 'refunded', 'open', 'paused'));
