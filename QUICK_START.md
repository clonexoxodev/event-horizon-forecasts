# 🚀 Quick Start Guide - Connect Frontend to Backend

## ✅ What's Already Done

1. ✅ Backend deployed and working at: `https://flippe-backend4-git-main-clonexoxodevs-projects.vercel.app`
2. ✅ Frontend configured to use production backend
3. ✅ API service updated with correct URLs

## 🎯 3 Simple Steps to Complete Setup

### Step 1: Test the Connection Locally

Open `event-horizon-forecasts-main/test-connection.html` in your browser to test the API connection.

Or run the frontend locally:
```bash
cd event-horizon-forecasts-main
npm install
npm run dev
```

### Step 2: Deploy Frontend to Vercel

**Windows:**
```bash
deploy-frontend.bat
```

**Mac/Linux:**
```bash
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

**Or manually:**
```bash
cd event-horizon-forecasts-main
vercel --prod
```

### Step 3: Update Backend CORS

After deploying frontend, you'll get a URL like: `https://your-app.vercel.app`

1. Go to: https://vercel.com/clonexoxodevs-projects/flippe-backend4
2. Click **Settings** → **Environment Variables**
3. Add or update:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
4. Redeploy backend:
   ```bash
   cd backend
   vercel --prod
   ```

## 🧪 Test Your Setup

### Test Backend (Already Working ✅)
```bash
curl https://flippe-backend4-git-main-clonexoxodevs-projects.vercel.app/api/health
```

### Test Frontend Connection
Open your deployed frontend and try:
- Sign up with a new account
- Login
- Check wallet balance
- View markets

## 📁 Files Updated

- ✅ `event-horizon-forecasts-main/.env` - Updated API URL
- ✅ `event-horizon-forecasts-main/src/lib/api.ts` - Updated default URL
- ✅ `event-horizon-forecasts-main/test-connection.html` - Test page created
- ✅ `deploy-frontend.bat` - Windows deployment script
- ✅ `deploy-frontend.sh` - Mac/Linux deployment script

## 🔗 Important URLs

**Backend API:** https://flippe-backend4-git-main-clonexoxodevs-projects.vercel.app
**Backend Dashboard:** https://vercel.com/clonexoxodevs-projects/flippe-backend4

**Frontend:** (Deploy to get URL)
**Frontend Dashboard:** (Will be created after first deploy)

## 📝 Environment Variables

### Frontend (.env) - Already Set ✅
```env
VITE_API_URL=https://flippe-backend4-git-main-clonexoxodevs-projects.vercel.app
VITE_SUPABASE_URL=https://tuqvhmxefiepdcmqffvt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend (Vercel Dashboard) - Need to Add FRONTEND_URL
```env
SUPABASE_URL=https://tuqvhmxefiepdcmqffvt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-key>
SUPABASE_ANON_KEY=<your-key>
JWT_SECRET=<your-secret>
FRONTEND_URL=<your-frontend-url-after-deploy>
```

## 🎉 That's It!

Your backend is already working. Just deploy the frontend and update the CORS settings, and you're done!

## 📚 Additional Resources

- Full guide: `FRONTEND_BACKEND_CONNECTION.md`
- Backend deployment: `backend/VERCEL_DEPLOYMENT.md`
- Backend fixes: `backend/FIXES_APPLIED.md`

## 🆘 Need Help?

If you encounter issues:
1. Check `FRONTEND_BACKEND_CONNECTION.md` for troubleshooting
2. Test with `test-connection.html`
3. Check Vercel logs: `vercel logs`
