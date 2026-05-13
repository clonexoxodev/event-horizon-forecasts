# Supabase Setup Guide for Prediction Platform

## Prerequisites
- Supabase account created
- Project created on Supabase
- Database password saved

## Step 1: Get Supabase Connection Details

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Database**
3. Copy the **Connection string** (URI format)
4. It will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

## Step 2: Update Backend Environment Variables

1. Copy `.env.supabase.example` to `.env.production`:
   ```bash
   cp .env.supabase.example .env.production
   ```

2. Edit `.env.production` and replace:
   - `[YOUR-PASSWORD]` with your Supabase database password
   - `[YOUR-PROJECT-REF]` with your Supabase project reference (from connection string)
   - `your-vercel-app.vercel.app` with your actual Vercel domain
   - `your-super-secret-jwt-key-change-this-in-production` with a strong random string

## Step 3: Run Database Schema on Supabase

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy the contents of `src/db/sqlite-schema.sql`
4. **Replace SQLite-specific syntax** with PostgreSQL:
   - Remove `AUTOINCREMENT` (PostgreSQL uses `SERIAL` or `GENERATED ALWAYS AS IDENTITY`)
   - Change `TEXT` to `VARCHAR` where appropriate
   - Update date functions if needed

5. Run the modified schema

### Option B: Using Migration Script

Run this command with your Supabase connection string:

```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" npm run migrate
```

## Step 4: Verify Database Setup

1. Go to **Table Editor** in Supabase dashboard
2. Verify these tables exist:
   - users
   - wallets
   - markets
   - positions
   - transactions
   - leaderboard_entries
   - notifications

## Step 5: Deploy to Vercel

### Backend Deployment

1. Create a new Vercel project for backend
2. Connect your GitHub repository
3. Set root directory to `backend`
4. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `FRONTEND_URL`
   - All other variables from `.env.production`

5. Deploy!

### Frontend Deployment

1. Create a new Vercel project for frontend
2. Connect your GitHub repository
3. Set root directory to `frontend`
4. Add environment variable:
   - `VITE_API_URL` = your backend Vercel URL (e.g., `https://your-backend.vercel.app`)

5. Deploy!

## Step 6: Update CORS Configuration

After deploying, update backend `.env` on Vercel:
```
FRONTEND_URL=https://your-frontend.vercel.app
```

Redeploy backend for changes to take effect.

## Step 7: Test Production

1. Visit your frontend URL
2. Try signing up
3. Check if wallet is created
4. Test deposit/withdrawal modals
5. Verify transaction history

## Troubleshooting

### Database Connection Issues
- Verify connection string is correct
- Check if Supabase project is active
- Ensure database password is correct
- Check if IP is whitelisted (Supabase allows all by default)

### CORS Errors
- Verify `FRONTEND_URL` in backend environment variables
- Ensure it matches your actual frontend domain
- Redeploy backend after changing

### Authentication Issues
- Check `JWT_SECRET` is set
- Verify cookies are being sent (check browser DevTools)
- Ensure `withCredentials: true` in API calls

## PostgreSQL Schema Conversion

Here's the PostgreSQL version of the schema (use this in Supabase SQL Editor):

```sql
-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_picture_url VARCHAR(500),
  instagram_handle VARCHAR(100),
  twitter_handle VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance_ngn_kobo BIGINT NOT NULL DEFAULT 0,
  balance_usd_cents BIGINT NOT NULL DEFAULT 0,
  available_ngn_kobo BIGINT NOT NULL DEFAULT 0,
  available_usd_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT balance_non_negative CHECK (balance_ngn_kobo >= 0 AND balance_usd_cents >= 0),
  CONSTRAINT available_non_negative CHECK (available_ngn_kobo >= 0 AND available_usd_cents >= 0),
  CONSTRAINT available_lte_balance CHECK (
    available_ngn_kobo <= balance_ngn_kobo AND 
    available_usd_cents <= balance_usd_cents
  )
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Markets Table
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  description TEXT,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'USD')),
  pool_amount_smallest_unit BIGINT NOT NULL DEFAULT 0,
  yes_pool_smallest_unit BIGINT NOT NULL DEFAULT 0,
  no_pool_smallest_unit BIGINT NOT NULL DEFAULT 0,
  min_position_smallest_unit BIGINT NOT NULL,
  max_position_smallest_unit BIGINT,
  state VARCHAR(20) NOT NULL CHECK (state IN ('active', 'closed', 'resolved')),
  winning_side VARCHAR(3) CHECK (winning_side IN ('YES', 'NO')),
  closes_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pool_consistency CHECK (
    pool_amount_smallest_unit = yes_pool_smallest_unit + no_pool_smallest_unit
  )
);

CREATE INDEX IF NOT EXISTS idx_markets_state ON markets(state);
CREATE INDEX IF NOT EXISTS idx_markets_closes_at ON markets(closes_at);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at DESC);

-- Positions Table
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  side VARCHAR(3) NOT NULL CHECK (side IN ('YES', 'NO')),
  amount_smallest_unit BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'USD')),
  potential_return_smallest_unit BIGINT NOT NULL,
  is_winner BOOLEAN,
  payout_smallest_unit BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  CONSTRAINT amount_positive CHECK (amount_smallest_unit > 0)
);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_market_id ON positions(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_created_at ON positions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_positions_user_market ON positions(user_id, market_id);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'position_entry', 'position_payout')),
  amount_smallest_unit BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'USD')),
  direction VARCHAR(3) NOT NULL CHECK (direction IN ('IN', 'OUT')),
  reference_id UUID,
  reference_type VARCHAR(20) CHECK (reference_type IN ('position', 'deposit', 'withdrawal')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT amount_positive CHECK (amount_smallest_unit > 0)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_id, reference_type);

-- Leaderboard Table
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  correct_predictions INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  rank INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT accuracy_range CHECK (accuracy_percentage >= 0 AND accuracy_percentage <= 100),
  CONSTRAINT predictions_consistency CHECK (correct_predictions <= total_predictions)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_entries(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard_entries(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON leaderboard_entries(user_id);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('market_resolved', 'deposit_confirmed', 'withdrawal_confirmed', 'position_won', 'position_lost')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  reference_id UUID,
  reference_type VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
```

## Next Steps

After successful setup:
1. Test all features in production
2. Set up monitoring (Vercel Analytics, Sentry)
3. Configure custom domain
4. Set up SSL certificates (automatic with Vercel)
5. Enable Supabase backups
