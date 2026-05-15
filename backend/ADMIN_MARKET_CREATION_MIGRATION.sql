-- =====================================================
-- ADMIN MARKET CREATION SYSTEM - DATABASE MIGRATION
-- =====================================================
-- This script updates the markets table and adds audit trail
-- for the admin market creation system
-- 
-- Run this in Supabase SQL Editor after the base schema
-- =====================================================

-- =====================================================
-- STEP 1: UPDATE MARKETS TABLE
-- =====================================================

-- Add new columns for admin market creation
ALTER TABLE markets ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS country_filter VARCHAR(2);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS market_type VARCHAR(20) NOT NULL DEFAULT 'binary' CHECK (market_type IN ('binary', 'multiple_choice'));
ALTER TABLE markets ADD COLUMN IF NOT EXISTS yes_label VARCHAR(50) NOT NULL DEFAULT 'Yes';
ALTER TABLE markets ADD COLUMN IF NOT EXISTS no_label VARCHAR(50) NOT NULL DEFAULT 'No';
ALTER TABLE markets ADD COLUMN IF NOT EXISTS yes_price DECIMAL(5,2);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS no_price DECIMAL(5,2);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS close_date TIMESTAMP;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS resolution_date TIMESTAMP;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS resolution_source TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS outcome VARCHAR(10) CHECK (outcome IN ('YES', 'NO', 'INVALID'));
ALTER TABLE markets ADD COLUMN IF NOT EXISTS status VARCHAR(20);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS participant_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Update existing markets to have default values
UPDATE markets SET 
  category = 'General' WHERE category IS NULL;
UPDATE markets SET 
  yes_price = 50.00, 
  no_price = 50.00 
WHERE yes_price IS NULL OR no_price IS NULL;
UPDATE markets SET 
  close_date = closes_at WHERE close_date IS NULL;
UPDATE markets SET 
  resolution_date = COALESCE(resolved_at, closes_at + INTERVAL '1 day') 
WHERE resolution_date IS NULL;
UPDATE markets SET 
  status = CASE 
    WHEN state = 'active' THEN 'active'
    WHEN state = 'closed' THEN 'paused'
    WHEN state = 'resolved' THEN 'resolved'
    ELSE 'draft'
  END
WHERE status IS NULL;

-- Make required columns NOT NULL after setting defaults
ALTER TABLE markets ALTER COLUMN category SET NOT NULL;
ALTER TABLE markets ALTER COLUMN yes_price SET NOT NULL;
ALTER TABLE markets ALTER COLUMN no_price SET NOT NULL;
ALTER TABLE markets ALTER COLUMN close_date SET NOT NULL;
ALTER TABLE markets ALTER COLUMN resolution_date SET NOT NULL;
ALTER TABLE markets ALTER COLUMN status SET NOT NULL;

-- Add constraints
ALTER TABLE markets ADD CONSTRAINT IF NOT EXISTS price_sum_equals_100 
  CHECK (yes_price + no_price = 100);

ALTER TABLE markets ADD CONSTRAINT IF NOT EXISTS price_range_yes 
  CHECK (yes_price >= 0 AND yes_price <= 100);

ALTER TABLE markets ADD CONSTRAINT IF NOT EXISTS price_range_no 
  CHECK (no_price >= 0 AND no_price <= 100);

ALTER TABLE markets ADD CONSTRAINT IF NOT EXISTS resolution_after_close 
  CHECK (resolution_date > close_date);

ALTER TABLE markets ADD CONSTRAINT IF NOT EXISTS close_date_future 
  CHECK (close_date > created_at);

ALTER TABLE markets ADD CONSTRAINT IF NOT EXISTS status_enum 
  CHECK (status IN ('draft', 'active', 'paused', 'resolved', 'archived'));

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_close_date ON markets(close_date);
CREATE INDEX IF NOT EXISTS idx_markets_country ON markets(country_filter) WHERE country_filter IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_markets_created_by ON markets(created_by);

-- Partial index for active markets (most queried)
CREATE INDEX IF NOT EXISTS idx_markets_active ON markets(close_date) 
  WHERE status = 'active';

-- =====================================================
-- STEP 2: CREATE MARKET AUDIT TRAIL TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS market_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  
  -- Who and when
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- What happened
  action_type VARCHAR(20) NOT NULL 
    CHECK (action_type IN ('create', 'update', 'status_change', 'delete')),
  
  -- Changed data (JSONB for flexibility)
  changed_fields JSONB,
  
  -- Full snapshot for critical actions
  snapshot_before JSONB,
  snapshot_after JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT
);

-- Indexes for audit trail
CREATE INDEX IF NOT EXISTS idx_audit_market_id ON market_audit_trail(market_id);
CREATE INDEX IF NOT EXISTS idx_audit_admin_user ON market_audit_trail(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON market_audit_trail(action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_type ON market_audit_trail(action_type);

-- Immutability: Prevent updates and deletes
CREATE OR REPLACE RULE audit_trail_immutable_update AS 
  ON UPDATE TO market_audit_trail DO INSTEAD NOTHING;

CREATE OR REPLACE RULE audit_trail_immutable_delete AS 
  ON DELETE TO market_audit_trail DO INSTEAD NOTHING;

-- Disable RLS for audit trail (admin-only access enforced at API level)
ALTER TABLE market_audit_trail DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: CREATE TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_markets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS markets_updated_at ON markets;
CREATE TRIGGER markets_updated_at
  BEFORE UPDATE ON markets
  FOR EACH ROW
  EXECUTE FUNCTION update_markets_updated_at();

-- Auto-set resolved_at when status changes to resolved
CREATE OR REPLACE FUNCTION set_markets_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND (OLD.status IS NULL OR OLD.status != 'resolved') THEN
    NEW.resolved_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS markets_resolved_at ON markets;
CREATE TRIGGER markets_resolved_at
  BEFORE UPDATE ON markets
  FOR EACH ROW
  EXECUTE FUNCTION set_markets_resolved_at();

-- Auto-set archived_at when status changes to archived
CREATE OR REPLACE FUNCTION set_markets_archived_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'archived' AND (OLD.status IS NULL OR OLD.status != 'archived') THEN
    NEW.archived_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS markets_archived_at ON markets;
CREATE TRIGGER markets_archived_at
  BEFORE UPDATE ON markets
  FOR EACH ROW
  EXECUTE FUNCTION set_markets_archived_at();

-- =====================================================
-- STEP 4: VERIFICATION QUERIES
-- =====================================================

-- Verify markets table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'markets'
ORDER BY ordinal_position;

-- Verify constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'markets';

-- Verify audit trail table exists
SELECT COUNT(*) as audit_trail_exists
FROM information_schema.tables
WHERE table_name = 'market_audit_trail';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Your markets table is now ready for admin market creation with:
-- ✅ All required fields (category, prices, dates, status, etc.)
-- ✅ Price validation constraints (sum = 100, range 0-100)
-- ✅ Date ordering constraints (resolution > close > creation)
-- ✅ Status enum constraint
-- ✅ Audit trail table with immutability
-- ✅ Automatic timestamp triggers
-- ✅ Optimistic locking with version field
-- =====================================================
