-- ============================================================================
-- FLIPPE → EVENT HORIZON — STAGE 2: ARGUMENT MVP SCHEMA
-- Version: 2.0
-- Date: 2026-09-15
--
-- Introduces the fixed-stake argument data model on top of the existing pool
-- engine. Legacy pool markets remain untouched; new "fixed" argument markets
-- carry extra columns that enforce:
--
--   1. A single, identical stake for all participants (stake_amount_smallest_unit).
--   2. One position per user per market, side locked at first join.
--   3. Automated outcome verification (sport_event / crypto_price / factual)
--      with an audit trail; 'manual' is allowed only on legacy non-argument
--      markets.
--   4. A whitelist of verifiable categories seeded via the categories table.
--
-- SAFETY:
--   - Every statement is idempotent; safe to run multiple times.
--   - No existing rows are modified unless backfilling a NULL column default.
--   - New CHECK constraints are scoped so legacy rows (pricing_model <> 'fixed')
--     are never rejected.
--   - RLS stays disabled; all enforcement is in the API layer.
--
-- Execute in Supabase SQL Editor. One shot.
-- ============================================================================

-- ============================================================================
-- SECTION 0: HELPERS (re-declared for standalone execution)
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

CREATE OR REPLACE FUNCTION drop_constraint_if_exists(p_table text, p_constraint text)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = format('public.%I', p_table)::regclass
      AND conname = p_constraint
  ) THEN
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', p_table, p_constraint);
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION drop_constraints_by_name(p_table text, VARIADIC p_names text[])
RETURNS void AS $$
DECLARE
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY p_names LOOP
    PERFORM drop_constraint_if_exists(p_table, v_name);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 1: MARKETS — ARGUMENT COLUMNS
-- ============================================================================

-- Fixed stake for argument markets (kobo). NULL for legacy pool markets.
SELECT add_column_if_missing('markets', 'stake_amount_smallest_unit', 'bigint');

-- Verification plumbing: which adapter resolves the outcome, what source
-- data was used, structured adapter params, lifecycle status, and the
-- winning side determined by the adapter (committed to winning_side by the
-- API after confirmation).
SELECT add_column_if_missing('markets', 'verification_method', 'text');
SELECT add_column_if_missing('markets', 'verification_source', 'text');
SELECT add_column_if_missing('markets', 'verification_params', 'jsonb', $$'{}'::jsonb$$);
SELECT add_column_if_missing('markets', 'verification_status', 'text', $$'pending'$$);
SELECT add_column_if_missing('markets', 'verification_attempt_count', 'integer', '0');
SELECT add_column_if_missing('markets', 'last_verification_attempt_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'verification_evidence', 'jsonb', $$'{}'::jsonb$$);
SELECT add_column_if_missing('markets', 'verified_outcome', 'varchar(3)');
SELECT add_column_if_missing('markets', 'verified_at', 'timestamptz');

-- NOTE ON verification_status: the helper adds the column with DEFAULT 'pending'
-- but no NOT NULL, so existing legacy rows remain NULL. The scheduler only ever
-- processes rows WHERE verification_method IS NOT NULL (i.e. fixed argument
-- markets), so legacy NULLs are intentionally inert.

-- ============================================================================
-- SECTION 2: POSITIONS — ONE-POSITION-PER-USER LOCK
-- ============================================================================

-- Boolean flag: true for fixed-stake argument positions. Enables a partial
-- unique index that prevents a user from holding more than one active position
-- on a single argument market.
SELECT add_column_if_missing('positions', 'one_position_only', 'boolean', 'false');

-- Enforce "one member, one side" for argument markets at the DB level.
-- The index ignores refunded/cancelled/sold positions so that if an argument
-- is refunded and re-activated the user can re-join.
CREATE UNIQUE INDEX IF NOT EXISTS positions_one_position_uniq
  ON positions(market_id, user_id)
  WHERE one_position_only = true
    AND status NOT IN ('refunded', 'cancelled', 'sold');

-- ============================================================================
-- SECTION 3: VERIFICATION ATTEMPTS AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id       uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  method          text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  attempt_number  integer NOT NULL DEFAULT 1,
  evidence        jsonb DEFAULT '{}'::jsonb,
  verified_outcome varchar(3),
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE verification_attempts DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 4: MARKETS CONSTRAINTS (idempotent recreation)
-- ============================================================================

-- 4.1 pricing_model enum — add 'fixed' to the allowed values.
DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'markets',
    'markets_pricing_model_check',
    'markets_pricing_model_v2_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'markets_pricing_model_check'
      AND conrelid = 'public.markets'::regclass
  ) THEN
    ALTER TABLE markets ADD CONSTRAINT markets_pricing_model_check
      CHECK (pricing_model IN (
        'pool', 'orderbook', 'ownership_shares', 'legacy_fixed_share',
        'legacy_pool', 'fixed'
      ));
  END IF;
END $$;

-- 4.2 Fixed-stake invariants: when pricing_model = 'fixed' the stake and
-- min/max position must be consistent and at least ₦1.00 (100 kobo).
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_stake_amount_check;
ALTER TABLE markets ADD CONSTRAINT markets_stake_amount_check
  CHECK (
    pricing_model <> 'fixed'
    OR (
      stake_amount_smallest_unit IS NOT NULL
      AND stake_amount_smallest_unit >= 100
      AND min_position_smallest_unit = stake_amount_smallest_unit
      AND (max_position_smallest_unit IS NULL
           OR max_position_smallest_unit = stake_amount_smallest_unit)
    )
  );

-- 4.3 Verification method whitelist (NULL allowed for legacy non-argument markets).
DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'markets',
    'markets_verification_method_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'markets_verification_method_check'
      AND conrelid = 'public.markets'::regclass
  ) THEN
    ALTER TABLE markets ADD CONSTRAINT markets_verification_method_check
      CHECK (verification_method IS NULL OR verification_method IN (
        'sport_event', 'crypto_market', 'factual', 'manual'
      ));
  END IF;
END $$;

-- 4.4 Argument markets must have an auto-verifiable method (no 'manual').
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_argument_verification_check;
ALTER TABLE markets ADD CONSTRAINT markets_argument_verification_check
  CHECK (
    pricing_model <> 'fixed'
    OR (verification_method IS NOT NULL AND verification_method <> 'manual')
  );

-- 4.5 Verification status lifecycle.
DO $$
BEGIN
  PERFORM drop_constraints_by_name(
    'markets',
    'markets_verification_status_check'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'markets_verification_status_check'
      AND conrelid = 'public.markets'::regclass
  ) THEN
    ALTER TABLE markets ADD CONSTRAINT markets_verification_status_check
      CHECK (verification_status IN (
        'pending', 'fetching', 'verified', 'failed', 'unverifiable'
      ));
  END IF;
END $$;

-- 4.6 Verified outcome (set by the verifier adapter before commitment).
ALTER TABLE markets DROP CONSTRAINT IF EXISTS markets_verified_outcome_check;
ALTER TABLE markets ADD CONSTRAINT markets_verified_outcome_check
  CHECK (verified_outcome IS NULL OR verified_outcome IN ('YES', 'NO'));

-- ============================================================================
-- SECTION 5: VERIFICATION ATTEMPTS CONSTRAINTS
-- ============================================================================

ALTER TABLE verification_attempts DROP CONSTRAINT IF EXISTS verification_attempts_status_check;
ALTER TABLE verification_attempts ADD CONSTRAINT verification_attempts_status_check
  CHECK (status IN ('pending', 'fetching', 'verified', 'failed', 'unverifiable'));

ALTER TABLE verification_attempts DROP CONSTRAINT IF EXISTS verification_attempts_outcome_check;
ALTER TABLE verification_attempts ADD CONSTRAINT verification_attempts_outcome_check
  CHECK (verified_outcome IS NULL OR verified_outcome IN ('YES', 'NO'));

-- ============================================================================
-- SECTION 6: CATEGORIES — VERIFIABLE WHITELIST
-- ============================================================================

-- Add a flag so the API can query `SELECT slug FROM categories WHERE is_verifiable`
-- instead of hard-coding a list.
SELECT add_column_if_missing('categories', 'is_verifiable', 'boolean', 'false');

-- Seed the "Verifiable knowledge/facts" category (required by MVP but absent
-- from the original seed).
INSERT INTO categories (name, slug, display_order, is_verifiable)
VALUES ('Verifiable knowledge/facts', 'facts', 11, true)
ON CONFLICT (slug) DO UPDATE SET
  is_verifiable = EXCLUDED.is_verifiable,
  display_order = GREATEST(categories.display_order, EXCLUDED.display_order);

-- Mark MVP-verifiable categories.
UPDATE categories SET is_verifiable = true WHERE slug IN ('sports', 'crypto', 'facts');

-- Ensure all existing rows have the flag (idempotent for future re-runs).
UPDATE categories SET is_verifiable = false WHERE is_verifiable IS NULL;

-- ============================================================================
-- SECTION 7: INDEXES
-- ============================================================================

-- Scheduler pickup: active argument markets whose verification is pending or
-- has failed and whose close_date has passed (ready to resolve).
CREATE INDEX IF NOT EXISTS idx_markets_verification_pending
  ON markets (close_date)
  WHERE verification_method IS NOT NULL
    AND verification_status IN ('pending', 'failed')
    AND status = 'active';

-- Verification attempts lookup by market.
CREATE INDEX IF NOT EXISTS idx_verification_attempts_market
  ON verification_attempts (market_id, created_at DESC);

-- Quick argument-market lookup (covers list + filter endpoints).
CREATE INDEX IF NOT EXISTS idx_markets_pricing_model_status
  ON markets (pricing_model, status, created_at DESC);

-- ============================================================================
-- SECTION 8: GRANTS
-- ============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- SECTION 9: NOTES FOR STAGE 2 API CHANGES
-- ============================================================================
--
-- 1. POST /api/markets (argument creation):
--    - Accept stake_amount_smallest_unit (required, integer, min 100).
--    - Accept verification_method (required; must be in
--      ('sport_event','crypto_market','factual') — NOT 'manual').
--    - Accept verification_source (optional text).
--    - Accept verification_params (optional jsonb; schema varies by method).
--    - Set pricing_model = 'fixed'.
--    - Set min_position = max_position = stake_amount.
--    - Set verification_status = 'pending'.
--    - Restrict creation to categories WHERE is_verifiable = true.
--
-- 2. POST /api/markets/:id/predictions (argument join):
--    - When market.pricing_model = 'fixed':
--      a) Ignore / reject custom amount; use market.stake_amount_smallest_unit.
--      b) Require user has sufficient available balance.
--      c) Check the unique partial index via an idempotent insert attempt:
--         if 23505 on positions_one_position_uniq, return existing position.
--      d) Set one_position_only = true on the inserted position.
--      e) Reject UP/DOWN (already mapped to YES/NO by normalizePredictionSide;
--         the frontend must only present YES/NO for fixed markets).
--
-- 3. Auto-verification scheduler (new module):
--    - Query: SELECT id, verification_method, verification_source,
--             verification_params FROM markets
--             WHERE verification_method IS NOT NULL
--               AND verification_status IN ('pending','failed')
--               AND status = 'active'
--               AND close_date <= now()
--             ORDER BY close_date ASC LIMIT 10;
--    - For each market: lookup adapter by method, call with source/params,
--      record attempt in verification_attempts, update market columns
--      (verification_status, verification_evidence, verified_outcome, verified_at,
--       verification_attempt_count, last_verification_attempt_at).
--    - When verified_outcome is determined AND status is still 'active':
--      transition to 'pending_resolution' or directly call the settlement
--      path with the verified outcome (see resolveMarketWithPayouts).
--
-- 4. Admin resolve path:
--    - When pricing_model = 'fixed', admin resolve should require
--      verification_status = 'verified' (or explicit override for emergency).
--    - Auto-close path: settlement lock, settleMarkets, status → resolved.
--
-- 5. Removal / disablement (Stage 2 frontend + backend code):
--    - ForecastSlip.tsx: replace with a side-only picker for fixed markets.
--    - Remove UP/DOWN display for fixed markets (keep for pool legacy).
--    - Portfolio / value estimation: ignore positions where
--      one_position_only = true (argument positions have no dynamic value).
--    - Protected-market activation: skip for fixed markets (always live).
--    - position_listings (secondary market): skip for fixed markets.
-- ============================================================================

-- Cleanup helpers (uncomment if desired).
-- DROP FUNCTION IF EXISTS add_column_if_missing(text,text,text,text);
-- DROP FUNCTION IF EXISTS drop_constraint_if_exists(text,text);
-- DROP FUNCTION IF EXISTS drop_constraints_by_name(text, VARIADIC text[]);