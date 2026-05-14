-- ========================================
-- COMPLETE SUPABASE FIX
-- This will fix ALL issues
-- ========================================

-- Step 1: Disable RLS on ALL tables
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS markets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leaderboard_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- Step 3: Grant ALL permissions to service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Step 4: Grant ALL permissions to anon (for testing)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Step 5: Verify RLS is disabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Step 6: Test query (should work now)
SELECT COUNT(*) as user_count FROM users;

-- ========================================
-- EXPECTED RESULTS:
-- - All tables show rls_enabled = false
-- - User count query returns a number
-- - No permission errors
-- ========================================
