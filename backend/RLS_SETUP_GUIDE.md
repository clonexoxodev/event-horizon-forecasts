# Row Level Security (RLS) Setup Guide

## Problem
When you enable RLS on Supabase tables, it blocks all access unless proper policies are in place. Since this app uses custom JWT authentication (not Supabase Auth), we need to use the Service Role Key to bypass RLS on the backend.

## Solution: Use Service Role Key

The Service Role Key bypasses RLS and is **secure** because:
- ✅ It's only used on the backend (server-side)
- ✅ Clients never get direct database access
- ✅ Your backend API handles all authentication and authorization
- ✅ RLS is still enabled (protecting against direct database access)

## Setup Steps

### 1. Get Your Service Role Key

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Click on your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (NOT the anon key)
5. ⚠️ **IMPORTANT**: Never expose this key in client-side code!

### 2. Update Your .env File

Add the service role key to your `backend/.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

JWT_SECRET=your-jwt-secret
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
```

### 3. Enable RLS on All Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

### 4. Restart Your Backend Server

```bash
cd backend
npm run dev
```

## How It Works

1. **Frontend** → Makes API requests to your backend
2. **Backend** → Validates JWT token
3. **Backend** → Uses Service Role Key to access Supabase (bypasses RLS)
4. **Supabase** → Returns data to backend
5. **Backend** → Returns data to frontend

## Security Model

```
┌─────────────┐
│   Client    │  ← Uses ANON key (limited access)
│  (Browser)  │  ← Cannot directly access database
└──────┬──────┘
       │ HTTP/HTTPS
       │ JWT Token
       ▼
┌─────────────┐
│   Backend   │  ← Validates JWT
│   Server    │  ← Uses SERVICE_ROLE key
└──────┬──────┘  ← Full database access
       │
       │ Service Role Key
       ▼
┌─────────────┐
│  Supabase   │  ← RLS Enabled
│  Database   │  ← Protected from direct access
└─────────────┘
```

## Verification

After setup, test your app:

1. ✅ Signup should work
2. ✅ Login should work
3. ✅ All database operations should work
4. ✅ RLS is enabled (check Supabase dashboard)
5. ✅ Security warning should be gone

## Troubleshooting

### "Invalid API key" error
- Make sure you copied the **service_role** key, not the anon key
- Check that the key is in your `.env` file
- Restart your backend server

### "Row Level Security" error
- Make sure you're using the service role key in `supabase-client.ts`
- The code should use `SUPABASE_SERVICE_ROLE_KEY` not `SUPABASE_ANON_KEY`

### Still can't login
- Check backend console for errors
- Verify your `.env` file has all required variables
- Make sure backend server restarted after .env changes

## Production Considerations

For production deployment:

1. ✅ Keep service role key in environment variables (never in code)
2. ✅ Use HTTPS for all API requests
3. ✅ Implement rate limiting on your backend
4. ✅ Add request validation and sanitization
5. ✅ Monitor for suspicious activity
6. ✅ Rotate keys periodically

## Alternative: Migrate to Supabase Auth

If you want to use Supabase Auth instead of custom JWT:

1. Remove custom user table and authentication
2. Use Supabase Auth API for signup/login
3. Use RLS policies with `auth.uid()`
4. See `supabase-rls-policies.sql` for policy examples

This would allow proper RLS policies but requires significant refactoring.
