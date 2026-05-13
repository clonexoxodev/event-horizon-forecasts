-- Row Level Security (RLS) Policies for Prediction Platform
-- Run this in Supabase SQL Editor to enable secure access to your database

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (if any)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Anyone can create a user (signup)" ON users;
DROP POLICY IF EXISTS "Public can read user profiles" ON users;

DROP POLICY IF EXISTS "Users can read their own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON wallets;
DROP POLICY IF EXISTS "System can create wallets" ON wallets;

DROP POLICY IF EXISTS "Anyone can read active markets" ON markets;
DROP POLICY IF EXISTS "System can manage markets" ON markets;

DROP POLICY IF EXISTS "Users can read their own positions" ON positions;
DROP POLICY IF EXISTS "Users can create positions" ON positions;
DROP POLICY IF EXISTS "System can update positions" ON positions;

DROP POLICY IF EXISTS "Users can read their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON transactions;
DROP POLICY IF EXISTS "System can update transactions" ON transactions;

DROP POLICY IF EXISTS "Anyone can read leaderboard" ON leaderboard_entries;
DROP POLICY IF EXISTS "System can manage leaderboard" ON leaderboard_entries;

DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Allow anyone to create a user (for signup)
CREATE POLICY "Anyone can create a user (signup)"
ON users
FOR INSERT
TO public
WITH CHECK (true);

-- Allow users to read their own data
CREATE POLICY "Users can read their own data"
ON users
FOR SELECT
TO public
USING (true);  -- Allow reading all users for leaderboard/public profiles

-- Allow users to update their own data
CREATE POLICY "Users can update their own data"
ON users
FOR UPDATE
TO public
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- ============================================================================
-- WALLETS TABLE POLICIES
-- ============================================================================

-- Allow users to read their own wallet
CREATE POLICY "Users can read their own wallet"
ON wallets
FOR SELECT
TO public
USING (auth.uid()::text = user_id::text);

-- Allow users to update their own wallet (for balance changes)
CREATE POLICY "Users can update their own wallet"
ON wallets
FOR UPDATE
TO public
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Allow wallet creation (for signup)
CREATE POLICY "System can create wallets"
ON wallets
FOR INSERT
TO public
WITH CHECK (true);

-- ============================================================================
-- MARKETS TABLE POLICIES
-- ============================================================================

-- Allow anyone to read markets (public data)
CREATE POLICY "Anyone can read active markets"
ON markets
FOR SELECT
TO public
USING (true);

-- Allow system to manage markets (insert/update/delete)
-- In production, you'd restrict this to admin users
CREATE POLICY "System can manage markets"
ON markets
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- ============================================================================
-- POSITIONS TABLE POLICIES
-- ============================================================================

-- Allow users to read their own positions
CREATE POLICY "Users can read their own positions"
ON positions
FOR SELECT
TO public
USING (auth.uid()::text = user_id::text);

-- Allow users to create positions
CREATE POLICY "Users can create positions"
ON positions
FOR INSERT
TO public
WITH CHECK (auth.uid()::text = user_id::text);

-- Allow system to update positions (for resolution)
CREATE POLICY "System can update positions"
ON positions
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- ============================================================================
-- TRANSACTIONS TABLE POLICIES
-- ============================================================================

-- Allow users to read their own transactions
CREATE POLICY "Users can read their own transactions"
ON transactions
FOR SELECT
TO public
USING (auth.uid()::text = user_id::text);

-- Allow users to create transactions
CREATE POLICY "Users can create transactions"
ON transactions
FOR INSERT
TO public
WITH CHECK (auth.uid()::text = user_id::text);

-- Allow system to update transactions (for status changes)
CREATE POLICY "System can update transactions"
ON transactions
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- ============================================================================
-- LEADERBOARD TABLE POLICIES
-- ============================================================================

-- Allow anyone to read leaderboard (public data)
CREATE POLICY "Anyone can read leaderboard"
ON leaderboard_entries
FOR SELECT
TO public
USING (true);

-- Allow system to manage leaderboard
CREATE POLICY "System can manage leaderboard"
ON leaderboard_entries
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Allow users to read their own notifications
CREATE POLICY "Users can read their own notifications"
ON notifications
FOR SELECT
TO public
USING (auth.uid()::text = user_id::text);

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO public
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Allow system to create notifications
CREATE POLICY "System can create notifications"
ON notifications
FOR INSERT
TO public
WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'wallets', 'markets', 'positions', 'transactions', 'leaderboard_entries', 'notifications');

-- List all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
