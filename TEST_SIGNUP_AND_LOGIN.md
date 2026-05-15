# Test Signup and Login

## Problem
Login is failing with "Invalid email or password" even with correct credentials.

## Possible Causes

1. **User doesn't exist in Supabase database**
2. **Password hash mismatch**
3. **Vercel environment variables not set**
4. **Supabase connection issue**

## Solution: Test Signup First

### Step 1: Try Signup
1. Go to: https://event-horizon-forecasts.vercel.app/signup
2. Create a NEW account:
   - Username: testuser123
   - Email: testuser123@test.com
   - Password: TestPass123!
3. Click "Sign Up"

**If signup works**: The backend is working, but your original account might not exist.

**If signup fails**: There's a deeper issue with Supabase connection.

### Step 2: Check Vercel Environment Variables

The backend needs these environment variables in Vercel:

1. Go to: https://vercel.com/dashboard
2. Click: `flippe-backend4`
3. Click: "Settings"
4. Click: "Environment Variables"
5. Verify these exist:
   - `SUPABASE_URL` = `https://tuqvhmxefiepdcmqffvt.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (the service role key from .env)
   - `JWT_SECRET` = `dev-secret-key-change-in-production`
   - `NODE_ENV` = `production`

**If missing**: Add them and redeploy.

### Step 3: Check Supabase Database

1. Go to: https://supabase.com/dashboard
2. Find your project: `tuqvhmxefiepdcmqffvt`
3. Click: "Table Editor"
4. Click: "users" table
5. Check if user exists with email: fehintoluwaolu@gmail.com

**If user doesn't exist**: You need to signup first.

**If user exists**: Check the password_hash field.

### Step 4: Reset Password (If Needed)

If the user exists but password doesn't work, you can:

**Option A: Signup with a new account**
- Use a different email
- This will create a new account

**Option B: Update password in Supabase**
1. Go to Supabase dashboard
2. Click "Table Editor"
3. Click "users" table
4. Find your user
5. Update password_hash with a new bcrypt hash

**Option C: Create a password reset endpoint**
- I can add a password reset feature

## Quick Test Commands

### Test Signup
```bash
curl -X POST https://flippe-backend4.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser123",
    "email": "testuser123@test.com",
    "password": "TestPass123!"
  }'
```

**Expected**: Success response with user data

### Test Login (After Signup)
```bash
curl -X POST https://flippe-backend4.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser123@test.com",
    "password": "TestPass123!"
  }'
```

**Expected**: Success response with user data

## Most Likely Issue

**The user account doesn't exist in the Supabase database.**

When you deployed the new backend, it might have connected to a fresh Supabase instance without your existing user data.

## Immediate Solution

1. **Try signup** with a new account
2. **If signup works**, use that account
3. **If you need the original account**, we can:
   - Check Supabase for existing users
   - Migrate data if needed
   - Create the super admin account manually

## Next Steps

1. Try signup first
2. If signup works, login with new account
3. If you need super admin access, I'll create a script to add super_admin role to your new account
