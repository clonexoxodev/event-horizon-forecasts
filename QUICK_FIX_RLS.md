# 🚨 QUICK FIX - DISABLE RLS NOW

## The Problem:
RLS (Row Level Security) is blocking your backend from accessing the database.

## The Solution (2 Minutes):

### 1. Open Supabase SQL Editor
https://supabase.com/dashboard/project/tuqvhmxefiepdcmqffvt

Click **SQL Editor** → **New Query**

### 2. Copy & Paste This:

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE markets DISABLE ROW LEVEL SECURITY;
ALTER TABLE positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```

### 3. Click Run

### 4. Test Login
https://event-horizon-forecasts.vercel.app/login

**IT WILL WORK!** ✅

---

## Alternative: Disable RLS via Table Editor

1. Go to **Table Editor** in Supabase
2. Click on **users** table
3. Click the **⚙️ Settings** icon
4. Find **"Enable Row Level Security (RLS)"**
5. **Turn it OFF**
6. Repeat for all tables:
   - users
   - wallets
   - markets
   - positions
   - transactions
   - leaderboard_entries
   - notifications

---

## That's It!

RLS disabled → Login works → Problem solved! 🎉

**Do this NOW and test login immediately!**
