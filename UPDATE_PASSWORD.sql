-- Update password for fehintoluwaolu@gmail.com
-- Password: fehin0706

UPDATE users
SET password_hash = '$2b$12$KocWvp13JsRKNmVHrt9vr.Po01xDnh1VtUwTwUNnznqZdzNq9f/5e',
    role = 'super_admin'
WHERE email = 'fehintoluwaolu@gmail.com';

-- Verify the update
SELECT id, username, email, role, created_at
FROM users
WHERE email = 'fehintoluwaolu@gmail.com';

/*
INSTRUCTIONS:

1. Go to: https://supabase.com/dashboard
2. Find project: tuqvhmxefiepdcmqffvt
3. Click: "SQL Editor"
4. Click: "New query"
5. Copy and paste this entire SQL script
6. Click: "Run"
7. You should see your user with role = 'super_admin'

8. Now go to: https://event-horizon-forecasts.vercel.app/login
9. Login with:
   - Email: fehintoluwaolu@gmail.com
   - Password: fehin0706

10. You should be logged in successfully!

If you want to use a different password, run:
  node backend/generate-password-hash.js "YourNewPassword"
  
Then update the password_hash in this SQL with the new hash.
*/
