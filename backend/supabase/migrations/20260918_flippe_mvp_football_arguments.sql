-- ============================================================================
-- FLIPPE MVP — FOOTBALL ARGUMENTS
-- Version: 1.0
-- Date: 2026-09-18
--
-- Extends the fixed-stake argument model (Stage 2) so arguments can be bound to
-- a specific football fixture and support the three MVP participation formats:
--
--   1. ONE_ON_ONE  ('1v1')      — exactly two participants, opposing sides.
--   2. GROUP       ('group')    — a bounded number of participants (3..100).
--   3. UNLIMITED   ('unlimited')— open participation, no cap.
--
-- It also captures per-participant reasoning ("opinion") and a durable cache
-- for API-Football fixtures so the free request quota is respected across
-- serverless invocations.
--
-- SAFETY:
--   - Every statement is idempotent; safe to run multiple times.
--   - Legacy pool/orderbook rows are never rejected: new CHECK constraints are
--     scoped to pricing_model = 'fixed' (or allow NULL for legacy rows).
--   - No existing columns are renamed or dropped.
--   - RLS stays disabled; enforcement remains in the API layer.
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

-- ============================================================================
-- SECTION 1: MARKETS — FOOTBALL BINDING + PARTICIPATION FORMAT
-- ============================================================================

-- Participation format for argument markets. NULL for legacy pool markets.
SELECT add_column_if_missing('markets', 'participation_format', 'text');

-- API-Football fixture id this argument is bound to (nullable for general
-- arguments that are not tied to a single match).
SELECT add_column_if_missing('markets', 'fixture_id', 'bigint');

-- Immutable snapshot of the fixture at argument-creation time: teams, badges,
-- league, kickoff, venue and status. Keeps argument pages rendering even when
-- the football API is unavailable or the fixture ages out of the cache.
SELECT add_column_if_missing('markets', 'match_snapshot', 'jsonb', $$'{}'::jsonb$$);

-- Joining closes at this instant (normally kickoff). Independent of close_date
-- so arguments can stay resolvable while participation is frozen.
SELECT add_column_if_missing('markets', 'join_deadline_at', 'timestamptz');

-- Minimum participants required before the argument is settled (2 by default).
SELECT add_column_if_missing('markets', 'min_participants', 'integer', '2');

-- How the question was produced: 'ai', 'suggested' or 'user'.
SELECT add_column_if_missing('markets', 'question_source', 'text', $$'user'$$);

-- AI provenance for the question (model, raw prompt, confidence, rationale).
SELECT add_column_if_missing('markets', 'ai_question_meta', 'jsonb', $$'{}'::jsonb$$);

-- Creator cancellation audit (allowed only before an opponent joins).
SELECT add_column_if_missing('markets', 'cancelled_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'cancellation_reason', 'text');

-- ============================================================================
-- SECTION 2: POSITIONS — PARTICIPANT REASONING
-- ============================================================================

-- The participant's stated reasoning / opinion attached to their side.
SELECT add_column_if_missing('positions', 'opinion', 'text');
SELECT add_column_if_missing('positions', 'updated_at', 'timestamptz', 'now()');

-- ============================================================================
-- SECTION 3: FOOTBALL FIXTURE CACHE
-- ============================================================================

-- Durable cache so expensive API-Football reads survive cold starts and the
-- free tier request quota is respected. Keyed by a namespaced cache key
-- (e.g. fixture:1234567, fixtures:live, fixtures:date:2026-09-18).
CREATE TABLE IF NOT EXISTS football_fixtures_cache (
  cache_key   text PRIMARY KEY,
  payload     jsonb NOT NULL,
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);

ALTER TABLE football_fixtures_cache DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_football_cache_expiry
  ON football_fixtures_cache (expires_at);

-- ============================================================================
-- SECTION 4: CONSTRAINTS (idempotent recreation)
-- ============================================================================

-- 4.1 Participation format whitelist. NULL allowed for legacy rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'markets_participation_format_check'
      AND conrelid = 'public.markets'::regclass
  ) THEN
    ALTER TABLE markets DROP CONSTRAINT markets_participation_format_check;
  END IF;
  ALTER TABLE markets ADD CONSTRAINT markets_participation_format_check
    CHECK (participation_format IS NULL OR participation_format IN ('1v1', 'group', 'unlimited'));
END $$;

-- 4.2 The three MVP formats are distinct. ONE_ON_ONE is explicitly two people;
-- GROUP is a bounded field; UNLIMITED has no participant cap.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'markets_participation_format_invariants'
      AND conrelid = 'public.markets'::regclass
  ) THEN
    ALTER TABLE markets DROP CONSTRAINT markets_participation_format_invariants;
  END IF;
  ALTER TABLE markets ADD CONSTRAINT markets_participation_format_invariants
    CHECK (
      participation_format IS NULL
      OR (
        (participation_format = '1v1' AND participant_limit = 2)
        OR (participation_format = 'group' AND participant_limit IS NOT NULL
            AND participant_limit >= 3 AND participant_limit <= 100)
        OR (participation_format = 'unlimited' AND participant_limit IS NULL)
      )
    );
END $$;

-- 4.3 Question source whitelist (NULL allowed for legacy rows).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'markets_question_source_check'
      AND conrelid = 'public.markets'::regclass
  ) THEN
    ALTER TABLE markets DROP CONSTRAINT markets_question_source_check;
  END IF;
  ALTER TABLE markets ADD CONSTRAINT markets_question_source_check
    CHECK (question_source IS NULL OR question_source IN ('ai', 'suggested', 'user'));
END $$;

-- ============================================================================
-- SECTION 5: BACKFILL EXISTING ARGUMENTS
-- ============================================================================

-- Existing fixed arguments store their format inside verification_params.mode.
-- Map 1v1 -> '1v1' (participant_limit 2) and everything else -> 'unlimited'
-- (group arguments created before the MVP had no cap).
UPDATE markets
SET participation_format = '1v1',
    participant_limit = 2
WHERE pricing_model = 'fixed'
  AND participation_format IS NULL
  AND (verification_params ->> 'mode') = '1v1';

UPDATE markets
SET participation_format = 'unlimited'
WHERE pricing_model = 'fixed'
  AND participation_format IS NULL;

-- Give every fixed argument a sensible join deadline (fall back to kickoff /
-- trading close / close date) and minimum participant count.
UPDATE markets
SET join_deadline_at = COALESCE(join_deadline_at, trading_close_at, closes_at, close_date)
WHERE pricing_model = 'fixed'
  AND join_deadline_at IS NULL;

UPDATE markets
SET min_participants = 2
WHERE pricing_model = 'fixed'
  AND (min_participants IS NULL OR min_participants < 2);

-- Non-football arguments: default the question source.
UPDATE markets
SET question_source = 'user'
WHERE pricing_model = 'fixed'
  AND question_source IS NULL;

-- ============================================================================
-- SECTION 6: INDEXES
-- ============================================================================

-- Match page: list public arguments bound to a fixture.
CREATE INDEX IF NOT EXISTS idx_markets_fixture_id
  ON markets (fixture_id)
  WHERE fixture_id IS NOT NULL;

-- Discovery: public arguments by format.
CREATE INDEX IF NOT EXISTS idx_markets_participation_format
  ON markets (participation_format, status, created_at DESC)
  WHERE pricing_model = 'fixed';

-- ============================================================================
-- SECTION 7: GRANTS
-- ============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- SECTION 8: NOTES FOR API CHANGES
-- ============================================================================
--
-- POST /api/markets (argument creation) additions:
--   - participation_format: '1v1' | 'group' | 'unlimited' (defaults derived
--     from verification.params.mode for backward compatibility).
--   - fixture_id + match_snapshot for football-bound arguments.
--   - join_deadline_at (defaults to trading_close_at / kickoff).
--   - question_source ('ai' | 'suggested' | 'user') + ai_question_meta.
--   - participant_limit enforced by participation_format invariant:
--       '1v1' -> 2, 'group' -> 3..100, 'unlimited' -> NULL.
--
-- POST /api/markets/:id/predictions additions:
--   - opinion (text, optional) stored on the participant's position.
--   - group/unlimited enforce participant_limit; 1v1 enforces opposing sides.
--
-- POST /api/markets/:id/cancel (new):
--   - Creator only, and only while no other participant has joined.
--   - Refunds any existing positions and marks the market cancelled.
-- ============================================================================
