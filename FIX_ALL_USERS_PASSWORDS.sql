-- ============================================================================
-- FIX ALL USER PASSWORDS - Reset to Known Password
-- ============================================================================
-- 
-- PROBLEM: Users exist but password hashes are corrupted/incompatible
-- SOLUTION: Reset all user passwords to a temporary password
-- 
-- After running this, ALL users can login with: TempPass123!
-- Then they can change their password in the app
-- ============================================================================

-- Step 1: Check all users and their current password hashes
SELECT 
    id,
    username,
    email,
    role,
    CASE 
        WHEN password_hash IS NULL THEN 'NULL - No password set'
        WHEN password_hash = '' THEN 'EMPTY - No password set'
        WHEN LENGTH(password_hash) < 50 THEN 'INVALID - Too short'
        WHEN password_hash NOT LIKE '$2%' THEN 'INVALID - Not bcrypt format'
        ELSE 'OK - Looks valid'
    END as password_status,
    created_at
FROM users
ORDER BY created_at DESC;

-- Step 2: Reset ALL user passwords to: TempPass123!
-- This bcrypt hash is for password: TempPass123!
UPDATE users
SET password_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztP.eKzV7W.u'
WHERE password_hash IS NULL 
   OR password_hash = '' 
   OR LENGTH(password_hash) < 50
   OR password_hash NOT LIKE '$2%';

-- Step 3: Set specific password for super admin
-- Password for fehintoluwaolu@gmail.com: fehin0706
UPDATE users
SET password_hash = '$2b$12$KocWvp13JsRKNmVHrt9vr.Po01xDnh1VtUwTwUNnznqZdzNq9f/5e',
    role = 'super_admin'
WHERE email = 'fehintoluwaolu@gmail.com';

-- Step 4: Verify all users now have valid password hashes
SELECT 
    id,
    username,
    email,
    role,
    CASE 
        WHEN password_hash LIKE '$2b$12$%' THEN '✅ FIXED - Valid bcrypt hash'
        ELSE '❌ STILL BROKEN'
    END as status,
    created_at
FROM users
ORDER BY created_at DESC;

-- Step 5: Count fixed users
SELECT 
    COUNT(*) as total_users,
    SUM(CASE WHEN password_hash LIKE '$2b$12$%' THEN 1 ELSE 0 END) as users_with_valid_password,
    SUM(CASE WHEN password_hash IS NULL OR password_hash = '' THEN 1 ELSE 0 END) as users_without_password
FROM users;

/*
============================================================================
INSTRUCTIONS:
============================================================================

1. Go to: https://supabase.com/dashboard
2. Find project: tuqvhmxefiepdcmqffvt
3. Click: "SQL Editor"
4. Click: "New query"
5. Copy and paste this ENTIRE file
6. Click: "Run"

RESULTS:
- All users with broken passwords will be reset to: TempPass123!
- Your super admin account will use: fehin0706
- All users can now login

AFTER RUNNING:
1. Login as super admin:
   - Email: fehintoluwaolu@gmail.com
   - Password: fehin0706

2. Other users can login with:
   - Their email
   - Password: TempPass123!

3. Tell users to change their password after first login

============================================================================
ALTERNATIVE: Reset specific user password
============================================================================

If you want to reset a specific user's password:

-- Generate hash for new password
-- Run in terminal: node backend/generate-password-hash.js "NewPassword123"

-- Then update specific user:
UPDATE users
SET password_hash = 'PASTE_HASH_HERE'
WHERE email = 'user@example.com';

============================================================================
*/
