# ✅ Supabase Setup Checklist

## Quick Answer: **You're Almost Done!**

You only need to do **ONE thing** in Supabase if you haven't already:

### ✅ Run the Schema SQL (One-Time Setup)

If you haven't created the database tables yet, you need to:

1. Go to your Supabase project: https://supabase.com/dashboard/project/tuqvhmxefiepdcmqffvt
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `backend/supabase-schema.sql`
5. Paste it into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

That's it! This creates all the tables your app needs.

---

## 🔍 How to Check if You've Already Done This

### Option 1: Check in Supabase Dashboard
1. Go to **Table Editor** in your Supabase dashboard
2. Look for these tables:
   - ✅ users
   - ✅ wallets
   - ✅ markets
   - ✅ positions
   - ✅ transactions
   - ✅ leaderboard_entries
   - ✅ notifications

If you see all these tables, **you're done!** ✅

### Option 2: Test with the API
Try signing up a user from your frontend. If it works, your database is set up correctly.

---

## 📋 Complete Supabase Checklist

### ✅ Already Done (From Your .env Files)

- ✅ Supabase project created
- ✅ Supabase URL: `https://tuqvhmxefiepdcmqffvt.supabase.co`
- ✅ Anon Key configured
- ✅ Service Role Key configured
- ✅ Environment variables set in backend

### ⏳ Need to Verify

- [ ] Database tables created (run `supabase-schema.sql`)
- [ ] Tables visible in Table Editor
- [ ] RLS (Row Level Security) disabled for development

### ❌ NOT Needed

- ❌ No need to configure authentication (using custom JWT)
- ❌ No need to set up RLS policies (disabled for development)
- ❌ No need to configure storage buckets (not used yet)
- ❌ No need to set up edge functions
- ❌ No need to configure realtime subscriptions

---

## 🧪 Test Your Supabase Setup

### Test 1: Check Tables Exist

Run this in Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
```

You should see:
- users
- wallets
- markets
- positions
- transactions
- leaderboard_entries
- notifications

### Test 2: Test Insert (Optional)

Run this in Supabase SQL Editor:
```sql
-- Test insert a user
INSERT INTO users (username, email, password_hash)
VALUES ('testuser', 'test@example.com', 'test_hash')
RETURNING *;

-- Check if it worked
SELECT * FROM users WHERE username = 'testuser';

-- Clean up
DELETE FROM users WHERE username = 'testuser';
```

### Test 3: Test from Your App

1. Start your frontend
2. Try to sign up with a new account
3. If it works, your Supabase is configured correctly!

---

## 🔧 What Your Backend Does with Supabase

Your backend uses Supabase as a PostgreSQL database:

1. **Authentication**: Custom JWT (not Supabase Auth)
2. **Database**: All tables in Supabase PostgreSQL
3. **Queries**: Direct SQL queries via Supabase client
4. **RLS**: Disabled (backend handles authorization)

---

## 🚨 Common Issues

### Issue: "relation 'users' does not exist"
**Solution**: Run the `supabase-schema.sql` file in SQL Editor

### Issue: "permission denied for table users"
**Solution**: Make sure you're using the SERVICE_ROLE_KEY in backend, not ANON_KEY

### Issue: "duplicate key value violates unique constraint"
**Solution**: User already exists. Try a different email/username

---

## 📊 Your Supabase Configuration

### Current Setup:
```
Project: tuqvhmxefiepdcmqffvt
URL: https://tuqvhmxefiepdcmqffvt.supabase.co
Region: (Check in Supabase dashboard)
Database: PostgreSQL 15
```

### Environment Variables (Already Set):
```env
# Backend
SUPABASE_URL=https://tuqvhmxefiepdcmqffvt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend
VITE_SUPABASE_URL=https://tuqvhmxefiepdcmqffvt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ✅ Final Checklist

Before deploying, verify:

- [ ] Supabase project is active
- [ ] Database tables created (run `supabase-schema.sql`)
- [ ] Environment variables set in Vercel backend
- [ ] Backend can connect to Supabase (test with health check)
- [ ] Frontend can sign up users (test signup flow)

---

## 🎉 Summary

**What you need to do:**
1. ✅ Run `supabase-schema.sql` in Supabase SQL Editor (if not done)
2. ✅ Verify tables exist in Table Editor
3. ✅ Test signup from your app

**What you DON'T need to do:**
- ❌ Configure Supabase Auth
- ❌ Set up RLS policies
- ❌ Configure storage
- ❌ Set up edge functions
- ❌ Change any Supabase settings

**Your Supabase is ready to use!** Just make sure the tables are created and you're good to go! 🚀
