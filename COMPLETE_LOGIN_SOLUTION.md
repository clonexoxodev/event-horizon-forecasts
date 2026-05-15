# 🔐 Complete Login Solution

## Problem
Login fails with "Invalid email or password" even with correct credentials.

## Root Cause
The user account doesn't exist in the Supabase database.

## 3 Solutions (Choose One)

---

## Solution 1: Signup (EASIEST - 1 minute)

### Step 1: Try Signup
1. Go to: https://event-horizon-forecasts.vercel.app/signup
2. Fill in:
   - Username: `fehintoluwa`
   - Email: `fehintoluwaolu@gmail.com`
   - Password: (your password)
3. Click "Sign Up"

### Step 2: Make Yourself Super Admin
1. Go to: https://supabase.com/dashboard
2. Find project: `tuqvhmxefiepdcmqffvt`
3. Click: "Table Editor"
4. Click: "users" table
5. Find your user (fehintoluwaolu@gmail.com)
6. Click "Edit" on the row
7. Change `role` from `user` to `super_admin`
8. Click "Save"

### Step 3: Login
1. Go to: https://event-horizon-forecasts.vercel.app/login
2. Enter your credentials
3. You're now logged in as super admin!

---

## Solution 2: Create User in Supabase (3 minutes)

### Step 1: Generate Password Hash
```bash
cd backend
node generate-password-hash.js "YourPassword123!"
```

This will output a bcrypt hash. Copy it.

### Step 2: Run SQL in Supabase
1. Go to: https://supabase.com/dashboard
2. Find project: `tuqvhmxefiepdcmqffvt`
3. Click: "SQL Editor"
4. Click: "New query"
5. Paste this SQL (replace the hash with yours):

```sql
-- Create super admin user
INSERT INTO users (username, email, password_hash, role)
VALUES (
  'fehintoluwa',
  'fehintoluwaolu@gmail.com',
  'YOUR_BCRYPT_HASH_HERE',  -- Replace with hash from Step 1
  'super_admin'
)
ON CONFLICT (email) DO UPDATE
SET role = 'super_admin';

-- Create wallet
INSERT INTO wallets (user_id, balance_ngn_kobo, balance_usd_cents, available_ngn_kobo, available_usd_cents)
SELECT id, 0, 0, 0, 0
FROM users
WHERE email = 'fehintoluwaolu@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
```

6. Click "Run"

### Step 3: Login
1. Go to: https://event-horizon-forecasts.vercel.app/login
2. Enter your credentials
3. You're now logged in as super admin!

---

## Solution 3: Check Environment Variables (If signup fails)

If signup also fails, the backend might not be connecting to Supabase.

### Step 1: Check Vercel Environment Variables
1. Go to: https://vercel.com/dashboard
2. Click: `flippe-backend4`
3. Click: "Settings"
4. Click: "Environment Variables"

### Step 2: Add These Variables (if missing)

```
SUPABASE_URL
Value: https://tuqvhmxefiepdcmqffvt.supabase.co

SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cXZobXhlZmllcGRjbXFmZnZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2NTQ3MywiZXhwIjoyMDkzNjQxNDczfQ.JYRBMh7Dh3YypwyvMLHZ7X9oBN2xMjL5VsUYoGkdKAA

JWT_SECRET
Value: dev-secret-key-change-in-production

NODE_ENV
Value: production
```

### Step 3: Redeploy
1. Go to: "Deployments" tab
2. Click: ••• on latest deployment
3. Click: "Redeploy"
4. Uncheck: "Use existing Build Cache"
5. Click: "Redeploy"
6. Wait: 1-2 minutes

### Step 4: Try Signup Again
After redeployment, try Solution 1 (signup).

---

## Quick Diagnostic

### Check if user exists:
```bash
curl -X POST https://flippe-backend4.vercel.app/api/debug/check-user \
  -H "Content-Type: application/json" \
  -d '{"email":"fehintoluwaolu@gmail.com"}'
```

**Response will tell you if user exists.**

### Test signup:
```bash
curl -X POST https://flippe-backend4.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username":"fehintoluwa",
    "email":"fehintoluwaolu@gmail.com",
    "password":"YourPassword123!"
  }'
```

### Test login (after signup):
```bash
curl -X POST https://flippe-backend4.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"fehintoluwaolu@gmail.com",
    "password":"YourPassword123!"
  }'
```

---

## Recommended Approach

**Start with Solution 1 (Signup)** - It's the fastest and easiest.

1. Try signup on the website
2. If it works, make yourself super admin in Supabase
3. Login and you're done!

If signup fails, then check environment variables (Solution 3) and try again.

---

## Files Created to Help You

1. `LOGIN_FIX_IMMEDIATE.md` - Quick fix guide
2. `TEST_SIGNUP_AND_LOGIN.md` - Testing instructions
3. `CREATE_SUPER_ADMIN.sql` - SQL to create user manually
4. `backend/generate-password-hash.js` - Generate bcrypt hash
5. `COMPLETE_LOGIN_SOLUTION.md` - This file

---

## After Login Works

Once you can login:

✅ You'll have access to the platform
✅ You can manage your wallet
✅ You can access super admin dashboard
✅ You can add/remove other admins
✅ Everything will work!

---

## Need Help?

If none of these solutions work:

1. Share the exact error message from browser console
2. Share the response from the diagnostic curl command
3. Check Vercel deployment logs for errors
4. Verify Supabase is accessible

---

**TRY SOLUTION 1 (SIGNUP) FIRST - IT'S THE FASTEST!**
