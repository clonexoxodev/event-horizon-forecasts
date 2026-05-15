# 🎯 EXACT STEPS TO FIX LOGIN

## Current Situation
- ✅ User exists: fehintoluwaolu@gmail.com
- ✅ Backend is working
- ❌ Password doesn't match
- ❌ Cannot login

## Fix in 3 Steps (2 minutes total)

---

## STEP 1: Open Supabase SQL Editor

1. **Open browser tab**: https://supabase.com/dashboard
2. **You should see**: Your project `tuqvhmxefiepdcmqffvt`
3. **Click**: "SQL Editor" in the left sidebar (icon looks like `</>`)
4. **Click**: "New query" button (green button, top right)

---

## STEP 2: Run This SQL

**Copy this ENTIRE block** and paste into the SQL editor:

```sql
UPDATE users
SET password_hash = '$2b$12$KocWvp13JsRKNmVHrt9vr.Po01xDnh1VtUwTwUNnznqZdzNq9f/5e',
    role = 'super_admin'
WHERE email = 'fehintoluwaolu@gmail.com';

SELECT id, username, email, role FROM users WHERE email = 'fehintoluwaolu@gmail.com';
```

**Click**: "Run" button (or press Ctrl+Enter)

**You should see**: A result showing your user with `role = 'super_admin'`

---

## STEP 3: Login

1. **Go to**: https://event-horizon-forecasts.vercel.app/login
2. **Enter**:
   - Email: `fehintoluwaolu@gmail.com`
   - Password: `fehin0706`
3. **Click**: "Log In"

**DONE!** You should now be logged in as super admin! ✅

---

## What Just Happened?

The SQL command:
1. Updated your password to `fehin0706`
2. Set your role to `super_admin`
3. Now you can login with the new password

---

## After Login

You'll have access to:
- ✅ Dashboard
- ✅ Wallet (deposit, withdraw, transactions)
- ✅ Super Admin Dashboard
- ✅ Add/remove admins
- ✅ Platform analytics

---

## If You Want to Change Password Later

1. **Generate new hash**:
   ```bash
   cd backend
   node generate-password-hash.js "YourNewPassword"
   ```

2. **Copy the hash** from the output

3. **Run in Supabase SQL Editor**:
   ```sql
   UPDATE users
   SET password_hash = 'PASTE_NEW_HASH_HERE'
   WHERE email = 'fehintoluwaolu@gmail.com';
   ```

---

## Troubleshooting

### "SQL Error" in Supabase
- Make sure you copied the ENTIRE SQL block
- Make sure you're in the SQL Editor (not Table Editor)
- Try refreshing the page and running again

### "Invalid email or password" after SQL
- Clear browser cache (Ctrl+Shift+Delete)
- Try incognito/private mode
- Make sure you're using password: `fehin0706`
- Check browser console for errors (F12)

### Still not working?
- Verify the SQL ran successfully (check the SELECT result)
- Try a different browser
- Check if backend is running: https://flippe-backend4.vercel.app/api/health

---

## Quick Verification

Before login, verify the SQL worked:

**In Supabase SQL Editor, run**:
```sql
SELECT email, role, created_at FROM users WHERE email = 'fehintoluwaolu@gmail.com';
```

**You should see**:
- email: fehintoluwaolu@gmail.com
- role: super_admin
- created_at: (some date)

If you see this, the SQL worked! Now try login.

---

## Summary

1. ✅ Open Supabase SQL Editor
2. ✅ Run the UPDATE SQL
3. ✅ Login with email + password `fehin0706`
4. ✅ Done!

**Total time: 2 minutes**

---

**DO IT NOW!**
