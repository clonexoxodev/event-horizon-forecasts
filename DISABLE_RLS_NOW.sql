-- ========================================
-- DISABLE RLS (Row Level Security)
-- Copy and paste this into Supabase SQL Editor
-- ========================================

-- Disable RLS on all tables
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS markets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leaderboard_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies (if any)
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Service role can do anything" ON users;

DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;
DROP POLICY IF EXISTS "Service role can do anything" ON wallets;

DROP POLICY IF EXISTS "Anyone can view markets" ON markets;
DROP POLICY IF EXISTS "Service role can do anything" ON markets;

DROP POLICY IF EXISTS "Users can view own positions" ON positions;
DROP POLICY IF EXISTS "Users can insert own positions" ON positions;
DROP POLICY IF EXISTS "Service role can do anything" ON positions;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can do anything" ON transactions;

DROP POLICY IF EXISTS "Anyone can view leaderboard" ON leaderboard_entries;
DROP POLICY IF EXISTS "Service role can do anything" ON leaderboard_entries;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can do anything" ON notifications;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- You should see rls_enabled = false for all tables
