-- ============================================================================
-- FLIPPE AUDIT: 09 MISSING RPC FUNCTIONS
-- Standalone fallback that creates all RPC functions the backend depends on.
-- Uses CREATE OR REPLACE FUNCTION so it is safe to run multiple times.
-- All functions handle BOTH NGN (kobo) and USD (cents) paths.
-- ============================================================================

-- ============================================================================
-- 1. UTILITY: add_column_if_missing
-- ============================================================================
CREATE OR REPLACE FUNCTION add_column_if_missing(
  p_table_name text,
  p_column_name text,
  p_column_type text,
  p_default text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND column_name = p_column_name
  ) THEN
    IF p_default IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN %I %s DEFAULT %s',
        p_table_name, p_column_name, p_column_type, p_default
      );
    ELSE
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN %I %s',
        p_table_name, p_column_name, p_column_type
      );
    END IF;
  END IF;
END;
$$;


-- ============================================================================
-- 2. atomic_lock_for_order: available -> locked
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_lock_for_order(
  p_wallet_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      available_usd_cents = w.available_usd_cents - p_amount,
      locked_usd_cents = w.locked_usd_cents + p_amount
    WHERE w.id = p_wallet_id
      AND w.available_usd_cents >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      available_ngn_kobo = w.available_ngn_kobo - p_amount,
      locked_ngn_kobo = w.locked_ngn_kobo + p_amount
    WHERE w.id = p_wallet_id
      AND w.available_ngn_kobo >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 3. atomic_unlock_from_order: locked -> available
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_unlock_from_order(
  p_wallet_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      locked_usd_cents = GREATEST(w.locked_usd_cents - p_amount, 0),
      available_usd_cents = w.available_usd_cents + p_amount
    WHERE w.id = p_wallet_id
      AND w.locked_usd_cents >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      locked_ngn_kobo = GREATEST(w.locked_ngn_kobo - p_amount, 0),
      available_ngn_kobo = w.available_ngn_kobo + p_amount
    WHERE w.id = p_wallet_id
      AND w.locked_ngn_kobo >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 4. atomic_credit_deposit: increase balance + available
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_credit_deposit(
  p_wallet_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      balance_usd_cents = w.balance_usd_cents + p_amount,
      available_usd_cents = w.available_usd_cents + p_amount
    WHERE w.id = p_wallet_id
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      balance_ngn_kobo = w.balance_ngn_kobo + p_amount,
      available_ngn_kobo = w.available_ngn_kobo + p_amount,
      total_deposited_ngn_kobo = w.total_deposited_ngn_kobo + p_amount
    WHERE w.id = p_wallet_id
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 5. atomic_reserve_for_withdrawal: available -> locked
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_reserve_for_withdrawal(
  p_wallet_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      available_usd_cents = w.available_usd_cents - p_amount,
      locked_usd_cents = w.locked_usd_cents + p_amount
    WHERE w.id = p_wallet_id
      AND w.available_usd_cents >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      available_ngn_kobo = w.available_ngn_kobo - p_amount,
      locked_ngn_kobo = w.locked_ngn_kobo + p_amount
    WHERE w.id = p_wallet_id
      AND w.available_ngn_kobo >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 6. atomic_approve_withdrawal: balance - amount, locked - amount, total_withdrawn + amount
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_approve_withdrawal(
  p_wallet_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      balance_usd_cents = GREATEST(w.balance_usd_cents - p_amount, 0),
      locked_usd_cents = GREATEST(w.locked_usd_cents - p_amount, 0)
    WHERE w.id = p_wallet_id
      AND w.locked_usd_cents >= p_amount
      AND w.balance_usd_cents >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      balance_ngn_kobo = GREATEST(w.balance_ngn_kobo - p_amount, 0),
      locked_ngn_kobo = GREATEST(w.locked_ngn_kobo - p_amount, 0),
      total_withdrawn_ngn_kobo = w.total_withdrawn_ngn_kobo + p_amount
    WHERE w.id = p_wallet_id
      AND w.locked_ngn_kobo >= p_amount
      AND w.balance_ngn_kobo >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 7. atomic_reject_withdrawal: locked -> available
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_reject_withdrawal(
  p_wallet_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      locked_usd_cents = GREATEST(w.locked_usd_cents - p_amount, 0),
      available_usd_cents = w.available_usd_cents + p_amount
    WHERE w.id = p_wallet_id
      AND w.locked_usd_cents >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      locked_ngn_kobo = GREATEST(w.locked_ngn_kobo - p_amount, 0),
      available_ngn_kobo = w.available_ngn_kobo + p_amount
    WHERE w.id = p_wallet_id
      AND w.locked_ngn_kobo >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 8. atomic_settlement_payout: available + payout, balance + profit, total_winnings + profit
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_settlement_payout(
  p_wallet_id uuid,
  p_payout bigint,
  p_profit bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      available_usd_cents = w.available_usd_cents + p_payout,
      balance_usd_cents = w.balance_usd_cents + p_profit,
      total_winnings_usd_cents = w.total_winnings_usd_cents + p_profit
    WHERE w.id = p_wallet_id
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      available_ngn_kobo = w.available_ngn_kobo + p_payout,
      balance_ngn_kobo = w.balance_ngn_kobo + p_profit,
      total_winnings_ngn_kobo = w.total_winnings_ngn_kobo + p_profit
    WHERE w.id = p_wallet_id
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 9. atomic_settlement_loss: balance - stake (GREATEST(0,...))
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_settlement_loss(
  p_wallet_id uuid,
  p_stake bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      balance_usd_cents = GREATEST(w.balance_usd_cents - p_stake, 0)
    WHERE w.id = p_wallet_id
      AND w.balance_usd_cents >= p_stake
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      balance_ngn_kobo = GREATEST(w.balance_ngn_kobo - p_stake, 0)
    WHERE w.id = p_wallet_id
      AND w.balance_ngn_kobo >= p_stake
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 10. atomic_decrement_available: available - amount
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_decrement_available(
  p_wallet_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      available_usd_cents = w.available_usd_cents - p_amount
    WHERE w.id = p_wallet_id
      AND w.available_usd_cents >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      available_ngn_kobo = w.available_ngn_kobo - p_amount
    WHERE w.id = p_wallet_id
      AND w.available_ngn_kobo >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 11. atomic_refund_to_available: available + amount
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_refund_to_available(
  p_wallet_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      available_usd_cents = w.available_usd_cents + p_amount
    WHERE w.id = p_wallet_id
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      available_ngn_kobo = w.available_ngn_kobo + p_amount
    WHERE w.id = p_wallet_id
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 12. atomic_settle_winner: unlock stake from locked, add profit to balance,
--     add payout to available + total_winnings
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_settle_winner(
  p_wallet_id uuid,
  p_stake bigint,
  p_payout bigint,
  p_profit bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      locked_usd_cents = GREATEST(w.locked_usd_cents - p_stake, 0),
      balance_usd_cents = w.balance_usd_cents + p_profit,
      available_usd_cents = w.available_usd_cents + p_payout,
      total_winnings_usd_cents = w.total_winnings_usd_cents + p_profit
    WHERE w.id = p_wallet_id
      AND w.locked_usd_cents >= p_stake
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      locked_ngn_kobo = GREATEST(w.locked_ngn_kobo - p_stake, 0),
      balance_ngn_kobo = w.balance_ngn_kobo + p_profit,
      available_ngn_kobo = w.available_ngn_kobo + p_payout,
      total_winnings_ngn_kobo = w.total_winnings_ngn_kobo + p_profit
    WHERE w.id = p_wallet_id
      AND w.locked_ngn_kobo >= p_stake
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 13. atomic_settle_loser: unlock stake from locked (GREATEST(0,...))
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_settle_loser(
  p_wallet_id uuid,
  p_stake bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      locked_usd_cents = GREATEST(w.locked_usd_cents - p_stake, 0)
    WHERE w.id = p_wallet_id
      AND w.locked_usd_cents >= p_stake
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      locked_ngn_kobo = GREATEST(w.locked_ngn_kobo - p_stake, 0)
    WHERE w.id = p_wallet_id
      AND w.locked_ngn_kobo >= p_stake
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 14. atomic_orderbook_settle: unlock from locked, add payout to balance,
--     add GREATEST(0,profit) to available + total_winnings
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_orderbook_settle(
  p_wallet_id uuid,
  p_stake bigint,
  p_payout bigint,
  p_profit bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      locked_usd_cents = GREATEST(w.locked_usd_cents - p_stake, 0),
      balance_usd_cents = w.balance_usd_cents + p_payout,
      available_usd_cents = w.available_usd_cents + GREATEST(p_profit, 0),
      total_winnings_usd_cents = w.total_winnings_usd_cents + GREATEST(p_profit, 0)
    WHERE w.id = p_wallet_id
      AND w.locked_usd_cents >= p_stake
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      locked_ngn_kobo = GREATEST(w.locked_ngn_kobo - p_stake, 0),
      balance_ngn_kobo = w.balance_ngn_kobo + p_payout,
      available_ngn_kobo = w.available_ngn_kobo + GREATEST(p_profit, 0),
      total_winnings_ngn_kobo = w.total_winnings_ngn_kobo + GREATEST(p_profit, 0)
    WHERE w.id = p_wallet_id
      AND w.locked_ngn_kobo >= p_stake
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 15. atomic_refund_order: locked -> available
-- ============================================================================
CREATE OR REPLACE FUNCTION atomic_refund_order(
  p_wallet_id uuid,
  p_amount bigint,
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  balance_ngn_kobo bigint,
  balance_usd_cents bigint,
  available_ngn_kobo bigint,
  available_usd_cents bigint,
  locked_ngn_kobo bigint,
  locked_usd_cents bigint,
  total_deposited_ngn_kobo bigint,
  total_withdrawn_ngn_kobo bigint,
  total_winnings_ngn_kobo bigint,
  total_winnings_usd_cents bigint,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_currency = 'USD' THEN
    RETURN QUERY
    UPDATE wallets w
    SET
      locked_usd_cents = GREATEST(w.locked_usd_cents - p_amount, 0),
      available_usd_cents = w.available_usd_cents + p_amount
    WHERE w.id = p_wallet_id
      AND w.locked_usd_cents >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  ELSE
    RETURN QUERY
    UPDATE wallets w
    SET
      locked_ngn_kobo = GREATEST(w.locked_ngn_kobo - p_amount, 0),
      available_ngn_kobo = w.available_ngn_kobo + p_amount
    WHERE w.id = p_wallet_id
      AND w.locked_ngn_kobo >= p_amount
    RETURNING
      w.id, w.user_id,
      w.balance_ngn_kobo, w.balance_usd_cents,
      w.available_ngn_kobo, w.available_usd_cents,
      w.locked_ngn_kobo, w.locked_usd_cents,
      w.total_deposited_ngn_kobo, w.total_withdrawn_ngn_kobo,
      w.total_winnings_ngn_kobo, w.total_winnings_usd_cents,
      w.currency;
  END IF;
END;
$$;


-- ============================================================================
-- 16. get_unsettled_positions: query function
-- ============================================================================
CREATE OR REPLACE FUNCTION get_unsettled_positions(
  p_currency text DEFAULT 'NGN'
)
RETURNS TABLE (
  position_id uuid,
  user_id uuid,
  market_id uuid,
  side text,
  amount bigint,
  currency text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS position_id,
    p.user_id,
    p.market_id,
    p.side,
    p.amount,
    p.currency,
    p.status,
    p.created_at
  FROM positions p
  WHERE p.currency = p_currency
    AND p.status IN ('active', 'locked', 'pending_settlement')
    AND NOT p.settled
  ORDER BY p.created_at ASC;
END;
$$;


-- ============================================================================
-- 17. get_active_orders_for_market: query function
-- ============================================================================
CREATE OR REPLACE FUNCTION get_active_orders_for_market(
  p_market_id uuid
)
RETURNS TABLE (
  order_id uuid,
  user_id uuid,
  side text,
  order_type text,
  amount bigint,
  price_per_share bigint,
  filled_amount bigint,
  remaining_amount bigint,
  status text,
  currency text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS order_id,
    o.user_id,
    o.side,
    o.order_type,
    o.amount,
    o.price_per_share,
    o.filled_amount,
    o.remaining_amount,
    o.status,
    o.currency,
    o.created_at
  FROM orders o
  WHERE o.market_id = p_market_id
    AND o.status IN ('pending', 'partial', 'open')
  ORDER BY o.created_at ASC;
END;
$$;
