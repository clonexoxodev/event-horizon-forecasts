# Quick Deploy to Vercel

## 🚀 Deploy in 3 Steps

### Step 1: Verify Setup
```bash
cd backend
npm run build
node test-api.mjs
```

### Step 2: Deploy
```bash
vercel
```

### Step 3: Set Environment Variables

Go to your Vercel project dashboard and add these:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-secret-key
FRONTEND_URL=https://your-frontend-domain.com
```

Then redeploy:
```bash
vercel --prod
```

## ✅ Test Your Deployment

```bash
curl https://your-domain.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Prediction Platform API is running",
  "timestamp": "2026-05-14T..."
}
```

## 🎉 Done!

Your API is now live at: `https://your-domain.vercel.app/api`

### Available Endpoints:
- `/api` - Root endpoint
- `/api/health` - Health check
- `/api/auth/*` - Authentication endpoints
- `/api/wallet/*` - Wallet endpoints
- `/api/markets/*` - Market endpoints

## 🐛 If Something Goes Wrong

1. Check logs: `vercel logs`
2. Verify environment variables are set in Vercel dashboard
3. Make sure Supabase credentials are correct
4. Test locally: `vercel dev`

## 📚 More Info

- Full deployment guide: `VERCEL_DEPLOYMENT.md`
- Detailed checklist: `DEPLOYMENT_CHECKLIST.md`
- All fixes applied: `FIXES_APPLIED.md`
