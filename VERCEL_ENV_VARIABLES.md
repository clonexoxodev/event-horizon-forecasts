# Vercel Environment Variables - Quick Reference

## 🔴 Backend Environment Variables

Copy these into your **Backend Vercel Project** → Settings → Environment Variables:

```
PORT=5002
```

```
NODE_ENV=production
```

```
FRONTEND_URL=https://your-frontend-app.vercel.app
```
⚠️ **Update this after deploying frontend!**

```
SUPABASE_URL=https://tuqvhmxefiepdcmqffvt.supabase.co
```

```
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cXZobXhlZmllcGRjbXFmZnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjU0NzMsImV4cCI6MjA5MzY0MTQ3M30._NA7CBLxZSR5oqR1sEIezaE4d2OHCKcDWll1Ari-kok
```

```
JWT_SECRET=GENERATE_RANDOM_32_CHAR_STRING
```
⚠️ **Generate using:** `openssl rand -base64 32`

```
JWT_EXPIRES_IN=24h
```

### Optional (can add later):

```
AWS_REGION=us-east-1
```

```
AWS_ACCESS_KEY_ID=your-access-key
```

```
AWS_SECRET_ACCESS_KEY=your-secret-key
```

```
S3_BUCKET=prediction-platform-uploads
```

```
EXCHANGE_API_URL=https://api.exchangerate-api.io/v4/latest
```

```
EXCHANGE_API_KEY=your-api-key
```

---

## 🔵 Frontend Environment Variables

Copy this into your **Frontend Vercel Project** → Settings → Environment Variables:

```
VITE_API_URL=https://your-backend-app.vercel.app
```
⚠️ **Update this with your actual backend URL after deploying backend!**

---

## 📝 How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click **"Settings"** tab
3. Click **"Environment Variables"** in the left sidebar
4. For each variable:
   - Enter the **Key** (e.g., `PORT`)
   - Enter the **Value** (e.g., `5002`)
   - Select which environments: **Production**, **Preview**, **Development** (select all)
   - Click **"Save"**

---

## 🔄 Deployment Order

1. **Deploy Backend** → Get backend URL
2. **Update Frontend** `VITE_API_URL` with backend URL → Deploy Frontend → Get frontend URL
3. **Update Backend** `FRONTEND_URL` with frontend URL → **Redeploy Backend**

This ensures CORS works correctly!

---

## ⚡ Quick Copy-Paste for Backend

```env
PORT=5002
NODE_ENV=production
FRONTEND_URL=https://your-frontend-app.vercel.app
SUPABASE_URL=https://tuqvhmxefiepdcmqffvt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cXZobXhlZmllcGRjbXFmZnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjU0NzMsImV4cCI6MjA5MzY0MTQ3M30._NA7CBLxZSR5oqR1sEIezaE4d2OHCKcDWll1Ari-kok
JWT_SECRET=GENERATE_RANDOM_32_CHAR_STRING
JWT_EXPIRES_IN=24h
```

## ⚡ Quick Copy-Paste for Frontend

```env
VITE_API_URL=https://your-backend-app.vercel.app
```

---

## 🎯 Remember

- Generate a **strong random JWT_SECRET** (don't use a simple password!)
- Update **FRONTEND_URL** in backend after deploying frontend
- Update **VITE_API_URL** in frontend with your actual backend URL
- **Redeploy backend** after updating FRONTEND_URL for CORS to work
