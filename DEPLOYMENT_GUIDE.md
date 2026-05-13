# Deployment Guide - Prediction Platform

## ✅ What's Already Done

- [x] Supabase project created (tuqvhmxefiepdcmqffvt)
- [x] Database schema file created (`backend/supabase-schema.sql`)
- [x] Environment files configured locally (`.env`, `.env.production`)
- [x] Frontend and backend code ready
- [x] Development servers tested (backend: 5002, frontend: 3001)

---

## 📋 Manual Steps You Need to Complete

### Step 1: Run SQL Schema in Supabase ⚠️ REQUIRED

1. Go to https://supabase.com/dashboard
2. Select your "prediction-platform" project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New Query"**
5. Copy the SQL from `backend/supabase-schema.sql` (or from the message I sent earlier)
6. Paste into SQL Editor
7. Click **"Run"**
8. Verify tables created: Go to **"Table Editor"** and confirm you see:
   - users
   - wallets
   - markets
   - positions
   - transactions
   - leaderboard_entries
   - notifications

---

### Step 2: Deploy Backend to Vercel

#### 2.1 Create New Vercel Project for Backend

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. **Important Settings:**
   - **Root Directory:** `backend`
   - **Framework Preset:** Other
   - **Build Command:** `npm run build` (or leave default)
   - **Output Directory:** Leave empty
   - **Install Command:** `npm install`

#### 2.2 Add Environment Variables

In Vercel project settings → Environment Variables, add these:

```
PORT=5002
NODE_ENV=production
FRONTEND_URL=https://your-frontend-app.vercel.app

SUPABASE_URL=https://tuqvhmxefiepdcmqffvt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cXZobXhlZmllcGRjbXFmZnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjU0NzMsImV4cCI6MjA5MzY0MTQ3M30._NA7CBLxZSR5oqR1sEIezaE4d2OHCKcDWll1Ari-kok

JWT_SECRET=GENERATE_A_RANDOM_SECRET_HERE
JWT_EXPIRES_IN=24h
```

**To generate JWT_SECRET:**
- Open terminal and run: `openssl rand -base64 32`
- Or use any random string generator (at least 32 characters)

**Note:** Leave `FRONTEND_URL` as placeholder for now. You'll update it after deploying frontend.

#### 2.3 Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete
3. **Copy your backend URL** (e.g., `https://your-backend.vercel.app`)

---

### Step 3: Deploy Frontend to Vercel

#### 3.1 Create New Vercel Project for Frontend

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Import the same GitHub repository (or create separate repo)
4. **Important Settings:**
   - **Root Directory:** `event-horizon-forecasts-main` (or your frontend folder)
   - **Framework Preset:** Vite (should auto-detect)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

#### 3.2 Add Environment Variables

In Vercel project settings → Environment Variables, add:

```
VITE_API_URL=https://your-backend.vercel.app
```

Replace `your-backend.vercel.app` with the actual backend URL from Step 2.3

#### 3.3 Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete
3. **Copy your frontend URL** (e.g., `https://your-frontend.vercel.app`)

---

### Step 4: Update Backend CORS Configuration

Now that you have your frontend URL, update the backend:

1. Go to your **backend Vercel project**
2. Go to **Settings** → **Environment Variables**
3. Find `FRONTEND_URL` and update it to your actual frontend URL:
   ```
   FRONTEND_URL=https://your-actual-frontend.vercel.app
   ```
4. Go to **Deployments** tab
5. Click the **three dots** on the latest deployment
6. Click **"Redeploy"** to apply the new environment variable

---

### Step 5: Test Production Deployment

1. Visit your frontend URL
2. Try to sign up for a new account
3. Check if wallet is created automatically
4. Test deposit/withdrawal modals (they should open)
5. Check transaction history

**If you see CORS errors:**
- Double-check `FRONTEND_URL` in backend matches your actual frontend URL
- Make sure you redeployed backend after updating the variable

---

## 🔧 Optional: AWS S3 Setup (For Profile Pictures)

If you want profile picture uploads to work, you'll need to:

1. Create an AWS account
2. Create an S3 bucket
3. Get AWS credentials (Access Key ID and Secret Access Key)
4. Add these to backend Vercel environment variables:
   ```
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   S3_BUCKET=prediction-platform-uploads
   ```

**Note:** This is optional. Profile pictures won't work without it, but everything else will.

---

## 🔧 Optional: Currency Conversion API

If you want real-time currency conversion (NGN/USD), you'll need:

1. Sign up for a free exchange rate API (e.g., https://exchangerate-api.com)
2. Get your API key
3. Add to backend Vercel environment variables:
   ```
   EXCHANGE_API_URL=https://api.exchangerate-api.io/v4/latest
   EXCHANGE_API_KEY=your-api-key
   ```

**Note:** This is optional. The app will use fallback rates without it.

---

## 📝 Quick Checklist

- [ ] Run SQL schema in Supabase
- [ ] Deploy backend to Vercel
- [ ] Copy backend URL
- [ ] Deploy frontend to Vercel with backend URL
- [ ] Copy frontend URL
- [ ] Update backend FRONTEND_URL with actual frontend URL
- [ ] Redeploy backend
- [ ] Test signup, wallet, and basic features
- [ ] (Optional) Set up AWS S3 for profile pictures
- [ ] (Optional) Set up currency conversion API

---

## 🆘 Troubleshooting

### CORS Errors
**Problem:** Frontend can't connect to backend
**Solution:** 
- Verify `FRONTEND_URL` in backend Vercel env matches your actual frontend URL
- Redeploy backend after changing environment variables

### Database Connection Errors
**Problem:** Backend can't connect to Supabase
**Solution:**
- Verify SQL schema was run successfully in Supabase
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct in Vercel

### Authentication Not Working
**Problem:** Can't sign up or login
**Solution:**
- Check that `JWT_SECRET` is set in backend Vercel environment variables
- Make sure it's a strong random string (at least 32 characters)

### Build Failures
**Problem:** Vercel deployment fails
**Solution:**
- Check build logs in Vercel dashboard
- Make sure `Root Directory` is set correctly (backend or frontend folder)
- Verify all dependencies are in package.json

---

## 🎉 After Successful Deployment

Once everything is working:

1. **Custom Domain (Optional):**
   - Go to Vercel project → Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Enable Supabase Backups:**
   - Go to Supabase dashboard → Settings → Database
   - Enable automatic backups

3. **Monitor Your App:**
   - Use Vercel Analytics (free)
   - Set up error tracking with Sentry (optional)

4. **Continue Development:**
   - Keep working on remaining tasks locally
   - Push to GitHub to trigger automatic deployments

---

## 📞 Need Help?

If you run into issues:
1. Check the Troubleshooting section above
2. Look at Vercel deployment logs
3. Check browser console for errors
4. Share the specific error message for help

---

**Good luck with your deployment! 🚀**
