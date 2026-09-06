-- ============================================================================
-- FLIPPE → EVENT HORIZON — WITHDRAWAL ROLLBACK FIX
-- Version: 1.0
-- Date: 2026-09-06
--
-- 20260904_mvp_pool_engine.sql dropped the order-book RPCs, including
-- atomic_unlock_from_order. The withdrawal-request endpoint still calls that
-- function in its rollback path (api/index.ts) when the request fails AFTER
-- funds were reserved (available -> locked). After the drop, that rollback
-- fails, the funds stay locked, and the transaction is never cleaned up.
--
-- This migration restores atomic_unlock_from_order with the same
-- locked -> available semantics it always had (mirrors atomic_reject_withdrawal
-- so the two paths can never drift apart). Safe to run repeatedly.
--
-- DOWN: DROP FUNCTION IF EXISTS atomic_unlock_from_order(uuid, bigint, text);
-- ============================================================================

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

GRANT EXECUTE ON FUNCTION atomic_unlock_from_order(uuid, bigint, text) TO service_role;