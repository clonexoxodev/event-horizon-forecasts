-- ============================================
-- SET SUPER ADMIN ROLE FOR fehintoluwaolu@gmail.com
-- ============================================
-- Copy this entire script and paste it into your Supabase SQL Editor
-- Then click "Run" or press Ctrl+Enter

-- Step 1: Check current role
SELECT 
    id,
    email,
    username,
    role,
    created_at
FROM users
WHERE email = 'fehintoluwaolu@gmail.com';

-- Step 2: Update role to super_admin
UPDATE users
SET role = 'super_admin'
WHERE email = 'fehintoluwaolu@gmail.com';

-- Step 3: Verify the update worked
SELECT 
    id,
    email,
    username,
    role,
    created_at
FROM users
WHERE email = 'fehintoluwaolu@gmail.com';

-- Step 4: Check all admins
SELECT 
    id,
    email,
    username,
    role
FROM users
WHERE role IN ('admin', 'super_admin')
ORDER BY role DESC, created_at ASC;

-- ============================================
-- EXPECTED RESULT:
-- You should see your email with role = 'super_admin'
-- ============================================
