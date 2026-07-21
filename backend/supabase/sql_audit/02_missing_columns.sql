-- ============================================================================
-- FLIPPE AUDIT: 02 MISSING COLUMNS
-- Columns referenced in code/RPC functions but NOT added by any migration.
-- ============================================================================

-- CRITICAL: Wallet columns for USD atomic operations
-- The sprint1 RPC functions (atomic_lock_for_order, etc.) reference these in
-- their USD branches and RETURNING clauses, but no migration creates them.

-- Helper function for idempotent column adds
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
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN %I %s DEFAULT %s',
        p_table, p_column, p_type, p_default
      );
    ELSE
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN %I %s',
        p_table, p_column, p_type
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- wallets: missing USD lock/winnings columns
-- These are referenced by atomic_lock_for_order, atomic_settle_position,
-- and the wallet balance query paths.
-- ============================================================================

SELECT add_column_if_missing('wallets', 'locked_usd_cents', 'bigint', '0');

SELECT add_column_if_missing('wallets', 'total_winnings_usd_cents', 'bigint', '0');
