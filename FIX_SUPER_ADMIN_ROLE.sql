-- Fix Super Admin Role for fehintoluwaolu@gmail.com
-- Run this in your Supabase SQL Editor

-- First, check current role
SELECT id, email, username, role, created_at
FROM users
WHERE email = 'fehintoluwaolu@gmail.com';

-- Update to super_admin role
UPDATE users
SET role = 'super_admin'
WHERE email = 'fehintoluwaolu@gmail.com';

-- Verify the update
SELECT id, email, username, role, created_at
FROM users
WHERE email = 'fehintoluwaolu@gmail.com';

-- Check all admin users
SELECT id, email, username, role
FROM users
WHERE role IN ('admin', 'super_admin')
ORDER BY role DESC, created_at ASC;
