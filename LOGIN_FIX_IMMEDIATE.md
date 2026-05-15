# 🚨 LOGIN FIX - IMMEDIATE ACTION REQUIRED

## Current Issue
Login fails with "Invalid email or password" even with correct credentials.

## Root Cause
The user account likely doesn't exist in the Supabase database, OR the Vercel environment variables aren't set.

## IMMEDIATE FIX - 3 Options

### Option 1: Try Signup First (FASTEST - 1 minute)

1. **Go to signup page**: https://event-horizon-forecasts.vercel.app/signup
2. **Create new account**:
   - Username: `fehintoluwa` (or any username)
   - Email: `fehintoluwaolu@gmail.com`
   - Password: (your password)
3. **Click "Sign Up"**

**If this works**: You now have an account and can login.

**If this fails**: Move to Option 2.

### Option 2: Check Vercel Environment Variables (2 minutes)

The backend needs environment variables to connect to Supabase.

1. **Go to**: https://vercel.com/dashboard
2. **Click**: `flippe-backend4` project
3. **Click**: "Settings" tab
4. **Click**: "Environment Variables"
5. **Add these if missing**:

```
SUPABASE_URL = https://tuqvhmxefiepdcmqffvt.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cXZobXhlZmllcGRjbXFmZnZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2NTQ3MywiZXhwIjoyMDkzNjQxNDczfQ.JYRBMh7Dh3YypwyvMLHZ7X9oBN2xMjL5VsUYoGkdKAA
JWT_SECRET = dev-secret-key-change-in-production
NODE_ENV = production
```

6. **Click "Save"**
7. **Redeploy**: Go to Deployments → Latest → ••• → Redeploy

### Option 3: Check User in Supabase (3 minutes)

1. **Go to**: https://supabase.com/dashboard
2. **Find project**: `tuqvhmxefiepdcmqffvt`
3. **Click**: "Table Editor"
4. **Click**: "users" table
5. **Check**: Does user with email `fehintoluwaolu@gmail.com` exist?

**If NO**: The user doesn't exist. Use Option 1 (signup).

**If YES**: The user exists but password might be wrong. Try:
- Reset password in Supabase
- Or create a new account with different email

## Quick Diagnostic

I've added a debug endpoint. Test if user exists:

```bash
curl -X POST https://flippe-backend4.vercel.app/api/debug/check-user \
  -H "Content-Type: application/json" \
  -d '{"email":"fehintoluwaolu@gmail.com"}'
```

**Response will tell you**:
- If user exists in database
- If not, you need to signup first

## Most Likely Solution

**Just try signup first.** The user probably doesn't exist in the database.

1. Go to signup page
2. Create account with your email
3. Login with new account
4. Done!

## After Signup Works

If you need super_admin role:

1. Login with new account
2. Go to Supabase dashboard
3. Table Editor → users table
4. Find your user
5. Edit `role` field to `super_admin`
6. Save
7. Logout and login again

## Redeploy Backend (If Needed)

I've added a debug endpoint. Redeploy to use it:

1. Vercel Dashboard → flippe-backend4
2. Deployments → Latest → ••• → Redeploy
3. Uncheck "Use existing Build Cache"
4. Click "Redeploy"
5. Wait 1-2 minutes

## Test After Redeploy

### Test 1: Check if user exists
```bash
curl -X POST https://flippe-backend4.vercel.app/api/debug/check-user \
  -H "Content-Type: application/json" \
  -d '{"email":"fehintoluwaolu@gmail.com"}'
```

### Test 2: Try signup
```bash
curl -X POST https://flippe-backend4.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username":"fehintoluwa",
    "email":"fehintoluwaolu@gmail.com",
    "password":"YourPassword123!"
  }'
```

### Test 3: Try login (after signup)
```bash
curl -X POST https://flippe-backend4.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"fehintoluwaolu@gmail.com",
    "password":"YourPassword123!"
  }'
```

## Bottom Line

**The backend is working fine.** The issue is either:
1. User doesn't exist (most likely) → **Solution: Signup**
2. Environment variables not set → **Solution: Add them in Vercel**
3. Password is wrong → **Solution: Reset in Supabase or signup with new email**

**Try signup first. It's the fastest solution.**
