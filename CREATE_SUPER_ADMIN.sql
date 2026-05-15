-- Create Super Admin User Manually
-- Run this in Supabase SQL Editor if signup doesn't work

-- First, check if user exists
SELECT id, email, username, role FROM users WHERE email = 'fehintoluwaolu@gmail.com';

-- If user doesn't exist, create it
-- Note: You'll need to hash the password first using bcrypt
-- Password hash below is for: "YourPassword123!" (change this!)

INSERT INTO users (username, email, password_hash, role)
VALUES (
  'fehintoluwa',
  'fehintoluwaolu@gmail.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztP.eKzV7W.u', -- This is a sample hash, replace with actual
  'super_admin'
)
ON CONFLICT (email) DO UPDATE
SET role = 'super_admin';

-- Create wallet for the user
INSERT INTO wallets (user_id, balance_ngn_kobo, balance_usd_cents, available_ngn_kobo, available_usd_cents)
SELECT id, 0, 0, 0, 0
FROM users
WHERE email = 'fehintoluwaolu@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Verify user was created
SELECT id, email, username, role, created_at FROM users WHERE email = 'fehintoluwaolu@gmail.com';

-- Verify wallet was created
SELECT w.id, w.user_id, w.balance_ngn_kobo, w.balance_usd_cents
FROM wallets w
JOIN users u ON w.user_id = u.id
WHERE u.email = 'fehintoluwaolu@gmail.com';

/*
IMPORTANT NOTES:

1. The password_hash above is just a sample. You need to generate a real bcrypt hash.

2. To generate a bcrypt hash for your password:
   - Use an online bcrypt generator: https://bcrypt-generator.com/
   - Or use Node.js:
     const bcrypt = require('bcrypt');
     const hash = await bcrypt.hash('YourPassword123!', 12);
     console.log(hash);

3. After running this SQL, you should be able to login with:
   - Email: fehintoluwaolu@gmail.com
   - Password: (whatever password you hashed)

4. The user will have super_admin role immediately.

5. If you get a conflict error, it means the user already exists.
   In that case, just update the role:
   
   UPDATE users SET role = 'super_admin' WHERE email = 'fehintoluwaolu@gmail.com';
*/
