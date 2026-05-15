# 🔥 FIX LOGIN NOW - Step by Step

## Problem Identified
✅ User exists in Supabase (fehintoluwaolu@gmail.com)
❌ Password hash doesn't match
❌ Cannot login

## Solution: Update Password in Supabase

### Step 1: Go to Supabase SQL Editor (1 minute)

1. Open: https://supabase.com/dashboard
2. Find project: `tuqvhmxefiepdcmqffvt`
3. Click: "SQL Editor" (left sidebar)
4. Click: "New query" button

### Step 2: Run This SQL (30 seconds)

Copy and paste this SQL into the editor:

```sql
-- Update password for fehintoluwaolu@gmail.com
-- Password will be: fehin0706

UPDATE users
SET password_hash = '$2b$12$KocWvp13JsRKNmVHrt9vr.Po01xDnh1VtUwTwUNnznqZdzNq9f/5e',
    role = 'super_admin'
WHERE email = 'fehintoluwaolu@gmail.com';

-- Verify the update
SELECT id, username, email, role, created_at
FROM users
WHERE email = 'fehintoluwaolu@gmail.com';
```

Click "Run" button.

You should see your user with `role = 'super_admin'`.

### Step 3: Login (30 seconds)

1. Go to: https://event-horizon-forecasts.vercel.app/login
2. Enter:
   - Email: `fehintoluwaolu@gmail.com`
   - Password: `fehin0706`
3. Click "Log In"

**YOU SHOULD NOW BE LOGGED IN!** ✅

---

## If You Want a Different Password

### Generate New Password Hash

```bash
cd backend
node generate-password-hash.js "YourNewPassword123!"
```

This will output a new hash. Copy it.

### Update in Supabase

```sql
UPDATE users
SET password_hash = 'YOUR_NEW_HASH_HERE'
WHERE email = 'fehintoluwaolu@gmail.com';
```

---

## What This Does

1. **Updates password hash** in Supabase to match "fehin0706"
2. **Sets role to super_admin** so you have full access
3. **Allows you to login** immediately

---

## After Login Works

Once logged in, you'll have:
- ✅ Full platform access
- ✅ Wallet functionality
- ✅ Super admin dashboard
- ✅ Ability to add/remove admins
- ✅ Platform analytics

---

## Files Created

1. `UPDATE_PASSWORD.sql` - SQL to update password
2. `FIX_LOGIN_NOW.md` - This guide
3. `backend/generate-password-hash.js` - Generate new password hashes

---

## Summary

**Current password in database**: Unknown/doesn't match
**New password after SQL**: `fehin0706`
**Your role**: `super_admin`

**Just run the SQL in Supabase and login!**

---

## Troubleshooting

### If SQL fails:
- Make sure you're in the correct Supabase project
- Make sure you're using the SQL Editor, not Table Editor
- Check for typos in the SQL

### If login still fails after SQL:
- Clear browser cache and cookies
- Try incognito/private browsing mode
- Check browser console for errors

### If you need help:
- Share the error message from Supabase SQL Editor
- Share the error message from browser console
- Verify the SQL ran successfully

---

**RUN THE SQL NOW AND LOGIN!**
