# 🚀 Deployment Checklist

Use this checklist to track your deployment progress.

---

## ✅ Pre-Deployment (Do These First)

- [ ] **Run SQL Schema in Supabase**
  - Go to Supabase dashboard → SQL Editor
  - Copy SQL from `backend/supabase-schema.sql`
  - Paste and run
  - Verify 7 tables created in Table Editor

- [ ] **Generate JWT Secret**
  - Run in terminal: `openssl rand -base64 32`
  - Copy the output (you'll need it for Vercel)

---

## 🔴 Backend Deployment

- [ ] **Create Vercel Project for Backend**
  - Go to https://vercel.com/dashboard
  - Click "Add New" → "Project"
  - Import your GitHub repository
  - Set Root Directory: `backend`
  - Framework: Other

- [ ] **Add Backend Environment Variables**
  - PORT=5002
  - NODE_ENV=production
  - FRONTEND_URL=https://your-frontend-app.vercel.app (placeholder for now)
  - SUPABASE_URL=https://tuqvhmxefiepdcmqffvt.supabase.co
  - SUPABASE_ANON_KEY=(your anon key)
  - JWT_SECRET=(the random string you generated)
  - JWT_EXPIRES_IN=24h

- [ ] **Deploy Backend**
  - Click "Deploy"
  - Wait for deployment to complete
  - **Write down your backend URL:** ___________________________________

---

## 🔵 Frontend Deployment

- [ ] **Create Vercel Project for Frontend**
  - Go to https://vercel.com/dashboard
  - Click "Add New" → "Project"
  - Import your GitHub repository (or same repo)
  - Set Root Directory: `event-horizon-forecasts-main`
  - Framework: Vite (should auto-detect)

- [ ] **Add Frontend Environment Variable**
  - VITE_API_URL=(your backend URL from above)

- [ ] **Deploy Frontend**
  - Click "Deploy"
  - Wait for deployment to complete
  - **Write down your frontend URL:** ___________________________________

---

## 🔄 Update Backend CORS

- [ ] **Update Backend Environment Variable**
  - Go to backend Vercel project → Settings → Environment Variables
  - Find FRONTEND_URL
  - Update it to your actual frontend URL (from above)
  - Save

- [ ] **Redeploy Backend**
  - Go to Deployments tab
  - Click three dots on latest deployment
  - Click "Redeploy"
  - Wait for redeployment to complete

---

## 🧪 Test Production

- [ ] **Visit your frontend URL**
- [ ] **Test signup**
  - Create a new account
  - Check if it succeeds
- [ ] **Check wallet creation**
  - After signup, you should see wallet balance (₦0.00 or $0.00)
- [ ] **Test deposit modal**
  - Click deposit button
  - Modal should open with payment options
- [ ] **Test withdrawal modal**
  - Click withdraw button
  - Modal should open
- [ ] **Check transaction history**
  - Should show empty state or any test transactions

---

## 🐛 Troubleshooting

If something doesn't work:

- [ ] **Check browser console for errors**
  - Press F12 → Console tab
  - Look for red error messages

- [ ] **Check Vercel deployment logs**
  - Go to Vercel project → Deployments
  - Click on the deployment
  - Check "Build Logs" and "Function Logs"

- [ ] **Verify CORS configuration**
  - Make sure FRONTEND_URL in backend matches your actual frontend URL
  - Make sure you redeployed backend after updating FRONTEND_URL

- [ ] **Verify Supabase connection**
  - Check that SQL schema was run successfully
  - Verify tables exist in Supabase Table Editor

---

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ You can visit your frontend URL and see the app
- ✅ You can sign up for a new account
- ✅ Wallet is created automatically with ₦0.00 balance
- ✅ Deposit and withdrawal modals open
- ✅ No CORS errors in browser console
- ✅ No errors in Vercel function logs

---

## 📝 URLs to Remember

**Backend URL:** ___________________________________

**Frontend URL:** ___________________________________

**Supabase Dashboard:** https://supabase.com/dashboard/project/tuqvhmxefiepdcmqffvt

**Vercel Dashboard:** https://vercel.com/dashboard

---

## 🔜 Optional Next Steps

After basic deployment works:

- [ ] Set up custom domain in Vercel
- [ ] Enable Supabase automatic backups
- [ ] Set up AWS S3 for profile pictures
- [ ] Add currency conversion API
- [ ] Set up error monitoring (Sentry)
- [ ] Enable Vercel Analytics

---

## 📞 Need Help?

If you get stuck:
1. Check the error message carefully
2. Look at `DEPLOYMENT_GUIDE.md` for detailed instructions
3. Check `VERCEL_ENV_VARIABLES.md` for correct environment variables
4. Share the specific error for help

**Good luck! 🚀**
