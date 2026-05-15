-- IMPORTANT: Run this SQL script in your Supabase SQL Editor
-- This will add the role column and set your account as super_admin

-- Step 1: Add role column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='role'
  ) THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user' 
      CHECK (role IN ('user', 'admin', 'super_admin'));
    
    CREATE INDEX idx_users_role ON users(role);
    
    RAISE NOTICE 'Role column added successfully';
  ELSE
    RAISE NOTICE 'Role column already exists';
  END IF;
END $$;

-- Step 2: Set fehintoluwaolu@gmail.com as super_admin
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'fehintoluwaolu@gmail.com';

-- Step 3: Verify the update
SELECT id, username, email, role 
FROM users 
WHERE email = 'fehintoluwaolu@gmail.com';

-- If you see your account with role = 'super_admin', you're all set!
-- If not, make sure you've signed up with that email first.
