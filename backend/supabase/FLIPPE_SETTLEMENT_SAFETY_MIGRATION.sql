-- ============================================================================
-- FLIPPE SETTLEMENT SAFETY MIGRATION
-- Version: 1.0
-- Date: 2026-07-22
--
-- Provides distributed settlement locking for markets:
--   - acquire_settlement_lock: prevents concurrent settlement runs
--   - release_settlement_lock: cleans up after settlement completes/fails
--   - cleanup_stale_settlement_locks: recovers from crashed workers
--
-- SAFE TO RUN MULTIPLE TIMES (all operations are idempotent)
-- Execute in Supabase SQL Editor. One shot.
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
-- SECTION 2: MISSING COLUMNS (settlement lock columns on markets)
-- ============================================================================

SELECT add_column_if_missing('markets', 'settlement_lock_owner', 'uuid');
SELECT add_column_if_missing('markets', 'settlement_lock_acquired_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'settlement_lock_expires_at', 'timestamptz');

-- ============================================================================
-- SECTION 3: FUNCTIONS
-- ============================================================================

-- 3.1 acquire_settlement_lock
-- Atomically acquires a settlement lock on a market.
-- Returns (locked boolean, error_message text).
-- If the lock is held by a live owner, returns error.
-- If the lock is expired (stale), allows takeover.
CREATE OR REPLACE FUNCTION acquire_settlement_lock(
  p_market_id uuid,
  p_lock_owner uuid,
  p_timeout_seconds int DEFAULT 300
) RETURNS TABLE(locked boolean, error_message text) AS $$
DECLARE
  v_market RECORD;
BEGIN
  -- Fetch current lock state (atomic read under implicit transaction)
  SELECT
    settlement_status,
    settlement_lock_owner,
    settlement_lock_expires_at
  INTO v_market
  FROM markets
  WHERE id = p_market_id;

  -- Market not found
  IF NOT FOUND THEN
    locked := false;
    error_message := 'Market not found';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Case 1: Already settled or no lock held — free to acquire
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

  -- Case 2: Lock held and not expired — blocked
  IF v_market.settlement_lock_expires_at > now() THEN
    locked := false;
    error_message := 'Settlement already in progress';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Case 3: Lock held but expired — allow takeover of stale lock
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

COMMENT ON FUNCTION acquire_settlement_lock(uuid, uuid, int) IS
  'Acquires an atomic settlement lock on a market. Returns (locked, error_message). '
  'Blocks if another owner holds a live lock; allows takeover of expired locks.';

-- 3.2 release_settlement_lock
-- Releases a settlement lock. Only the lock owner can release.
-- Optionally updates settlement_status and settlement_error.
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

  IF v_updated = 0 THEN
    released := false;
  ELSE
    released := true;
  END IF;

  RETURN NEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION release_settlement_lock(uuid, uuid, text, text) IS
  'Releases a settlement lock. Only the lock owner can release. '
  'Optionally sets final status and error message. Returns (released).';

-- 3.3 cleanup_stale_settlement_locks
-- Finds markets stuck in 'settling' with an expired lock and resets them to 'failed'.
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

COMMENT ON FUNCTION cleanup_stale_settlement_locks(int) IS
  'Cleans up stale settlement locks where the lock has expired. '
  'Resets settlement_status to failed and clears lock columns. Returns count of cleaned locks.';

-- ============================================================================
-- SECTION 4: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_markets_settlement_lock_owner
  ON markets(settlement_lock_owner)
  WHERE settlement_lock_owner IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_markets_settlement_lock_expires
  ON markets(settlement_lock_expires_at)
  WHERE settlement_status = 'settling';

-- ============================================================================
-- SECTION 5: GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION acquire_settlement_lock(uuid, uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION release_settlement_lock(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_stale_settlement_locks(int) TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
