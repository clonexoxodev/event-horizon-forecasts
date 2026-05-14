# Vercel Deployment Checklist

## ✅ Pre-Deployment Checks

- [x] API handler created at `api/index.ts`
- [x] All dependencies installed
- [x] `vercel.json` configured correctly
- [x] TypeScript errors fixed
- [x] Supabase client uses lazy initialization
- [x] Error handling added to serverless function
- [x] CORS configured properly
- [x] `.vercelignore` created to exclude unnecessary files

## 🔧 Configuration Files

### `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node",
      "config": {
        "maxDuration": 10
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api"
    },
    {
      "src": "/(.*)",
      "dest": "/api"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Environment Variables to Set in Vercel Dashboard

**Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET`
- `FRONTEND_URL`

**Optional:**
- `JWT_EXPIRES_IN`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `EXCHANGE_API_URL`
- `EXCHANGE_API_KEY`

## 🚀 Deployment Steps

1. **Verify local setup:**
   ```bash
   npm run build
   node test-api.mjs
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```

3. **Set environment variables in Vercel dashboard**

4. **Deploy to production:**
   ```bash
   vercel --prod
   ```

5. **Test the deployment:**
   ```bash
   curl https://your-domain.vercel.app/api/health
   ```

## 🔍 Testing Endpoints

After deployment, test these endpoints:

```bash
# Health check
curl https://your-domain.vercel.app/api/health

# Root endpoint
curl https://your-domain.vercel.app/api

# Auth endpoints (example)
curl -X POST https://your-domain.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'
```

## 🐛 Troubleshooting

### If deployment fails:
1. Check Vercel logs: `vercel logs`
2. Verify all environment variables are set
3. Check that Supabase credentials are correct
4. Ensure the API handler doesn't have syntax errors

### If function crashes:
1. Check for missing environment variables
2. Verify Supabase connection
3. Check for import errors in route files
4. Review error logs in Vercel dashboard

### Common Issues:

**Issue:** `FUNCTION_INVOCATION_FAILED`
**Solution:** 
- Check environment variables are set
- Verify Supabase credentials
- Check for module import errors

**Issue:** CORS errors
**Solution:**
- Set `FRONTEND_URL` environment variable
- Verify CORS configuration in `api/index.ts`

**Issue:** Database connection errors
**Solution:**
- Verify Supabase URL and keys
- Check Supabase project is active
- Ensure RLS policies allow server-side access

## ✨ Features Implemented

- ✅ Lazy initialization of Supabase client
- ✅ Comprehensive error handling
- ✅ Dynamic route loading with fallbacks
- ✅ CORS configuration
- ✅ Health check endpoint
- ✅ TypeScript support
- ✅ Environment variable validation
- ✅ Proper serverless function structure

## 📝 Notes

- The build script is set to skip TypeScript compilation because Vercel handles it
- The API handler uses dynamic imports to avoid initialization errors
- All routes are loaded with try-catch to prevent crashes
- The Supabase client uses lazy initialization to avoid environment variable issues
