-- Prediction Platform Database Schema for Supabase (PostgreSQL)
-- Copy and paste this entire file into Supabase SQL Editor

-- Disable Row Level Security for development
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS markets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leaderboard_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  profile_picture_url VARCHAR(500),
  instagram_handle VARCHAR(100),
  twitter_handle VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance_ngn_kobo BIGINT NOT NULL DEFAULT 0,
  balance_usd_cents BIGINT NOT NULL DEFAULT 0,
  available_ngn_kobo BIGINT NOT NULL DEFAULT 0,
  available_usd_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT balance_non_negative CHECK (balance_ngn_kobo >= 0 AND balance_usd_cents >= 0),
  CONSTRAINT available_non_negative CHECK (available_ngn_kobo >= 0 AND available_usd_cents >= 0),
  CONSTRAINT available_lte_balance CHECK (
    available_ngn_kobo <= balance_ngn_kobo AND 
    available_usd_cents <= balance_usd_cents
  )
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Markets Table
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  description TEXT,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'USD')),
  pool_amount_smallest_unit BIGINT NOT NULL DEFAULT 0,
  yes_pool_smallest_unit BIGINT NOT NULL DEFAULT 0,
  no_pool_smallest_unit BIGINT NOT NULL DEFAULT 0,
  min_position_smallest_unit BIGINT NOT NULL,
  max_position_smallest_unit BIGINT,
  state VARCHAR(20) NOT NULL CHECK (state IN ('active', 'closed', 'resolved')),
  winning_side VARCHAR(3) CHECK (winning_side IN ('YES', 'NO')),
  closes_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pool_consistency CHECK (
    pool_amount_smallest_unit = yes_pool_smallest_unit + no_pool_smallest_unit
  )
);

CREATE INDEX IF NOT EXISTS idx_markets_state ON markets(state);
CREATE INDEX IF NOT EXISTS idx_markets_closes_at ON markets(closes_at);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at DESC);

-- Admin market management additions
-- Run these on existing projects before using the admin dashboard.
ALTER TABLE markets ADD COLUMN IF NOT EXISTS status VARCHAR(20);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE markets ADD COLUMN IF NOT EXISTS country_filter VARCHAR(2);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS market_type TEXT DEFAULT 'binary';
ALTER TABLE markets ADD COLUMN IF NOT EXISTS yes_label TEXT DEFAULT 'YES';
ALTER TABLE markets ADD COLUMN IF NOT EXISTS no_label TEXT DEFAULT 'NO';
ALTER TABLE markets ADD COLUMN IF NOT EXISTS yes_price INTEGER DEFAULT 50;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS no_price INTEGER DEFAULT 50;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS close_date TIMESTAMP;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS resolution_date TIMESTAMP;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS resolution_source TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS resolution_instructions TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS outcome VARCHAR(10);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS participant_count INTEGER DEFAULT 0;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
UPDATE markets SET status = COALESCE(status, state, 'active');
UPDATE markets SET close_date = COALESCE(close_date, closes_at);

CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_created_by ON markets(created_by);

-- Storage buckets needed by admin media upload:
-- 1. Create a public bucket named market-images.
-- 2. Create a public bucket named market-videos.
-- 3. Backend uploads must use the Supabase service role key only.
-- Example storage policies if clients ever read directly:
-- CREATE POLICY "Public market image read" ON storage.objects FOR SELECT USING (bucket_id = 'market-images');
-- CREATE POLICY "Public market video read" ON storage.objects FOR SELECT USING (bucket_id = 'market-videos');
-- Do not allow public INSERT/UPDATE/DELETE. Uploads should go through the backend admin API.

-- Positions Table
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  side VARCHAR(3) NOT NULL CHECK (side IN ('YES', 'NO')),
  amount_smallest_unit BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'USD')),
  potential_return_smallest_unit BIGINT NOT NULL,
  entry_price INTEGER CHECK (entry_price >= 0 AND entry_price <= 100),
  is_winner BOOLEAN,
  payout_smallest_unit BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  CONSTRAINT amount_positive CHECK (amount_smallest_unit > 0)
);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_market_id ON positions(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_created_at ON positions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_positions_user_market ON positions(user_id, market_id);

-- Market Price History Table
CREATE TABLE IF NOT EXISTS market_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  yes_price INTEGER NOT NULL CHECK (yes_price >= 0 AND yes_price <= 100),
  no_price INTEGER NOT NULL CHECK (no_price >= 0 AND no_price <= 100),
  yes_pool_smallest_unit BIGINT NOT NULL DEFAULT 0,
  no_pool_smallest_unit BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT market_price_history_total CHECK (yes_price + no_price = 100)
);

CREATE INDEX IF NOT EXISTS idx_market_price_history_market_id ON market_price_history(market_id);
CREATE INDEX IF NOT EXISTS idx_market_price_history_created_at ON market_price_history(created_at DESC);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'position_entry', 'position_payout', 'refund')),
  amount_smallest_unit BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'USD')),
  direction VARCHAR(3) NOT NULL CHECK (direction IN ('IN', 'OUT')),
  reference_id UUID,
  reference_type VARCHAR(20) CHECK (reference_type IN ('position', 'deposit', 'withdrawal')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT amount_positive CHECK (amount_smallest_unit > 0)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_id, reference_type);

-- Leaderboard Table
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  correct_predictions INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  rank INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT accuracy_range CHECK (accuracy_percentage >= 0 AND accuracy_percentage <= 100),
  CONSTRAINT predictions_consistency CHECK (correct_predictions <= total_predictions)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_entries(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard_entries(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON leaderboard_entries(user_id);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('market_resolved', 'deposit_confirmed', 'withdrawal_confirmed', 'position_won', 'position_lost')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  reference_id UUID,
  reference_type VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);

-- Disable Row Level Security for all tables (for development)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE markets DISABLE ROW LEVEL SECURITY;
ALTER TABLE positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;


-- Position Listings Table (for Sell Position feature)
CREATE TABLE IF NOT EXISTS position_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  listing_code VARCHAR(8) UNIQUE NOT NULL,
  asking_price BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'sold', 'cancelled')),
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sold_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT asking_price_positive CHECK (asking_price > 0)
);

CREATE INDEX IF NOT EXISTS idx_position_listings_position_id ON position_listings(position_id);
CREATE INDEX IF NOT EXISTS idx_position_listings_listing_code ON position_listings(listing_code);
CREATE INDEX IF NOT EXISTS idx_position_listings_status ON position_listings(status);
CREATE INDEX IF NOT EXISTS idx_position_listings_created_at ON position_listings(created_at DESC);

-- Disable RLS for position_listings
ALTER TABLE IF EXISTS position_listings DISABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE position_listings IS 'Stores position listings for the secondary market (sell position feature)';


-- Migration: Add role column to existing users table (if upgrading from previous schema)
-- This is safe to run multiple times
DO $$ 
BEGIN
  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));
    CREATE INDEX idx_users_role ON users(role);
  END IF;
  
  -- Set primary super admin role for fehintoluwaolu@gmail.com
  UPDATE users SET role = 'super_admin' WHERE email = 'fehintoluwaolu@gmail.com';
END $$;

-- Add comment
COMMENT ON COLUMN users.role IS 'User role: user (default), admin (can manage markets), super_admin (can manage admins and view analytics)';
