-- ============================================================================
-- FLIPPE → EVENT HORIZON — POOL ENGINE MVP MIGRATION 1
-- Version: 1.0
-- Date: 2026-09-04
--
-- Completes the Order Book → Pool Engine migration and provisions the MVP
-- architecture defined by the product spec (sections 1–66):
--
--   1. Lifecycle & visibility plumbing for markets (public/private)
--   2. Prediction idempotency keys (safe retries)
--   3. Pool accounting ledger (market_pools)
--   4. Canonical-event + duplicate detection (canonical_events)
--   5. Creator / promoter attribution (market_promoters, creator_rewards)
--   6. Categories catalog for discovery
--   7. Admin review queue (market_reviews)
--   8. Order-book cleanup: drop orders / order_fills / trades / order_events
--      and their vestigial columns (the legacy order-book paths are gone)
--   9. Discovery & search indexes (trigram search, trending/popular/new)
--
-- Idempotent: safe to run repeatedly. Does NOT alter live pool math defaults
-- (fees default 0; visibility defaults public; thresholds preserved), so
-- existing markets keep behaving exactly as before.
--
-- ROLLBACK: see the DOWN migration at the bottom.
-- ============================================================================

-- ============================================================================
-- SECTION 0: HELPER (idempotent column adds)
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
-- SECTION 1: MARKETS — LIFECYCLE, VISIBILITY, POOL ENGINE CONFIG, DISCOVERY
-- ============================================================================

-- Public / private visibility. Existing markets default to public.
ALTER TABLE markets ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'markets_visibility_check' AND conrelid = 'markets'::regclass
  ) THEN
    ALTER TABLE markets ADD CONSTRAINT markets_visibility_check
      CHECK (visibility IN ('public', 'private'));
  END IF;
END $$;

-- Private market join codes (share/invite).
SELECT add_column_if_missing('markets', 'invite_code', 'text');
SELECT add_column_if_missing('markets', 'participant_limit', 'integer');

-- Settlement economics for the pool engine (0 = current behavior preserved).
SELECT add_column_if_missing('markets', 'platform_fee_bps', 'integer', '0');
SELECT add_column_if_missing('markets', 'creator_reward_bps', 'integer', '0');

-- Stable entry probability for new markets. NULL for existing markets so their
-- live yes_price keeps governing pricing (no behavior change on upgrade).
SELECT add_column_if_missing('markets', 'starting_yes_price', 'integer');

-- Review lifecycle metadata.
SELECT add_column_if_missing('markets', 'submitted_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'reviewed_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'approved_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'rejected_at', 'timestamptz');
SELECT add_column_if_missing('markets', 'rejection_reason', 'text');

-- Discovery / ranking support columns.
SELECT add_column_if_missing('markets', 'base_score', 'numeric', '0');

-- Private invite codes must be unique when set.
CREATE UNIQUE INDEX IF NOT EXISTS markets_invite_code_uniq
  ON markets(invite_code)
  WHERE invite_code IS NOT NULL;

-- Public markets are always visible on discovery; private only when active.
CREATE INDEX IF NOT EXISTS idx_markets_visibility ON markets(visibility);
CREATE INDEX IF NOT EXISTS idx_markets_status_created
  ON markets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_status_volume
  ON markets(status, total_volume_smallest_unit DESC);
CREATE INDEX IF NOT EXISTS idx_markets_status_participants
  ON markets(status, participant_count DESC);
CREATE INDEX IF NOT EXISTS idx_markets_status_trades
  ON markets(status, trade_count DESC);
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);

-- Trigram search for question / description ("%term%" style search).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS markets_question_trgm_idx
  ON markets USING gin (question gin_trgm_ops);
CREATE INDEX IF NOT EXISTS markets_description_trgm_idx
  ON markets USING gin (description gin_trgm_ops);

-- ============================================================================
-- SECTION 2: POSITIONS — PREDICTION IDEMPOTENCY
-- ============================================================================

SELECT add_column_if_missing('positions', 'idempotency_key', 'text');

-- One live position attempt per (market, user, key). Partial index ignores NULL
-- so legacy rows (which have no key) never collide.
CREATE UNIQUE INDEX IF NOT EXISTS positions_idempotency_uniq
  ON positions(market_id, user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_market_status_side
  ON positions(market_id, status, side);

-- ============================================================================
-- SECTION 3: MARKET POOLS LEDGER (pool accounting & audit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_pools (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id                 uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  yes_pool_smallest_unit    bigint NOT NULL DEFAULT 0,
  no_pool_smallest_unit     bigint NOT NULL DEFAULT 0,
  total_pool_smallest_unit  bigint NOT NULL DEFAULT 0,
  participants              integer NOT NULL DEFAULT 0,
  sealed_at                 timestamptz,
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_pools_market_uniq UNIQUE (market_id),
  CONSTRAINT market_pools_total_consistent CHECK (
    total_pool_smallest_unit = yes_pool_smallest_unit + no_pool_smallest_unit
  )
);

ALTER TABLE market_pools DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_market_pools_total ON market_pools(total_pool_smallest_unit DESC);

-- ============================================================================
-- SECTION 4: CANONICAL EVENTS — DUPLICATE / REPEAT DETECTION
-- ============================================================================

CREATE TABLE IF NOT EXISTS canonical_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  normalized_key text NOT NULL,
  category      text NOT NULL DEFAULT 'Other',
  created_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT canonical_events_key_uniq UNIQUE (normalized_key)
);

ALTER TABLE canonical_events DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_canonical_events_category ON canonical_events(category);
CREATE INDEX IF NOT EXISTS idx_canonical_events_created ON canonical_events(created_at DESC);

-- Join table: markets that represent the same canonical event.
CREATE TABLE IF NOT EXISTS market_events (
  market_id       uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  canonical_event_id uuid NOT NULL REFERENCES canonical_events(id) ON DELETE CASCADE,
  is_original     boolean NOT NULL DEFAULT true,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'flagged', 'approved', 'merged')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (market_id, canonical_event_id)
);

ALTER TABLE market_events DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 5: CREATOR / PROMOTER ATTRIBUTION AND REWARDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_promoters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id     uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship  text NOT NULL CHECK (relationship IN ('creator', 'promoter')),
  share_code    text,
  reward_bps    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_promoters_uniq UNIQUE (market_id, user_id, relationship)
);

ALTER TABLE market_promoters DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_market_promoters_share ON market_promoters(share_code) WHERE share_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_market_promoters_user ON market_promoters(user_id);

CREATE TABLE IF NOT EXISTS creator_rewards (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id               uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id                 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_smallest_unit    bigint NOT NULL CHECK (amount_smallest_unit >= 0),
  currency                text NOT NULL DEFAULT 'NGN',
  source                  text NOT NULL DEFAULT 'market_settlement' CHECK (source IN ('market_settlement', 'promotion')),
  status                  text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'failed')),
  reference_id            uuid,
  credited_at             timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE creator_rewards DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_creator_rewards_user ON creator_rewards(user_id, status);
CREATE INDEX IF NOT EXISTS idx_creator_rewards_market ON creator_rewards(market_id);

-- Private market membership (invite/join).
CREATE TABLE IF NOT EXISTS market_participants (
  market_id   uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (market_id, user_id)
);

ALTER TABLE market_participants DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_market_participants_user ON market_participants(user_id);

-- ============================================================================
-- SECTION 6: CATEGORIES CATALOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_uniq UNIQUE (name),
  CONSTRAINT categories_slug_uniq UNIQUE (slug)
);

ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

INSERT INTO categories (name, slug, display_order)
VALUES
  ('Sports', 'sports', 1),
  ('Crypto', 'crypto', 2),
  ('Politics', 'politics', 3),
  ('Economy', 'economy', 4),
  ('Entertainment', 'entertainment', 5),
  ('Music', 'music', 6),
  ('Technology', 'technology', 7),
  ('Business', 'business', 8),
  ('Global', 'global', 9),
  ('Other', 'other', 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SECTION 7: ADMIN REVIEW QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id     uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  reviewer_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action        text NOT NULL CHECK (action IN ('approved', 'rejected', 'needs_changes', 'flagged')),
  reason        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE market_reviews DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_market_reviews_market ON market_reviews(market_id, created_at DESC);

-- ============================================================================
-- SECTION 8: ORDER-BOOK REMOVAL
-- The order-book engine is replaced by the pool engine. These tables and
-- columns are unused by any deployed handler; they are removed to complete
-- the jump to pool accounting.
-- ============================================================================

DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS order_fills CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS order_events CASCADE;

DO $$
DECLARE
  col text;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'best_bid_price', 'best_ask_price', 'last_trade_price', 'last_trade_at',
    'total_orders_count', 'matched_volume_smallest_unit', 'max_exposure_per_user',
    'max_exposure_per_side', 'max_imbalance_ratio', 'max_order_size',
    'max_daily_exposure'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'markets' AND column_name = col
    ) THEN
      EXECUTE format('ALTER TABLE public.markets DROP COLUMN %I', col);
    END IF;
  END LOOP;

  FOREACH col IN ARRAY ARRAY['order_id', 'first_fill_price', 'last_fill_price', 'fill_count'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'positions' AND column_name = col
    ) THEN
      EXECUTE format('ALTER TABLE public.positions DROP COLUMN %I', col);
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS atomic_lock_for_order(uuid, bigint, text);
DROP FUNCTION IF EXISTS atomic_unlock_from_order(uuid, bigint, text);
DROP FUNCTION IF EXISTS update_orders_updated_at();
DROP FUNCTION IF EXISTS add_column_if_missing(text, text, text, text);

-- ============================================================================
-- SECTION 9: INDEX BOOKKEEPING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_markets_state ON markets(state);
CREATE INDEX IF NOT EXISTS idx_markets_closes_at ON markets(closes_at);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);

-- ============================================================================
-- DOWN MIGRATION
-- Manual rollback notes (the schema runner records this file as applied; to
-- revert, run the following in order, then delete the schema_migrations row):
--
--   CREATE TABLE IF NOT EXISTS orders (...);         -- restore order-book DDL
--   CREATE TABLE IF NOT EXISTS order_fills (...);
--   CREATE TABLE IF NOT EXISTS trades (...);
--   CREATE TABLE IF NOT EXISTS order_events (...);
--   ALTER TABLE markets DROP COLUMN IF EXISTS visibility;
--   ALTER TABLE markets DROP COLUMN IF EXISTS invite_code;
--   ALTER TABLE markets DROP COLUMN IF EXISTS participant_limit;
--   ALTER TABLE markets DROP COLUMN IF EXISTS platform_fee_bps;
--   ALTER TABLE markets DROP COLUMN IF EXISTS creator_reward_bps;
--   ALTER TABLE markets DROP COLUMN IF EXISTS starting_yes_price;
--   ALTER TABLE markets DROP COLUMN IF EXISTS submitted_at;
--   ALTER TABLE markets DROP COLUMN IF EXISTS reviewed_at;
--   ALTER TABLE markets DROP COLUMN IF EXISTS approved_at;
--   ALTER TABLE markets DROP COLUMN IF EXISTS rejected_at;
--   ALTER TABLE markets DROP COLUMN IF EXISTS rejection_reason;
--   ALTER TABLE markets DROP COLUMN IF EXISTS base_score;
--   ALTER TABLE positions DROP COLUMN IF EXISTS idempotency_key;
--   DROP TABLE IF EXISTS market_reviews CASCADE;
--   DROP TABLE IF EXISTS market_participants CASCADE;
--   DROP TABLE IF EXISTS market_promoters CASCADE;
--   DROP TABLE IF EXISTS creator_rewards CASCADE;
--   DROP TABLE IF EXISTS market_events CASCADE;
--   DROP TABLE IF EXISTS canonical_events CASCADE;
--   DROP TABLE IF EXISTS market_pools CASCADE;
--   DROP TABLE IF EXISTS categories CASCADE;
-- ============================================================================