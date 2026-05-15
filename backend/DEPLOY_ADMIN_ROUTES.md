# Deploy Admin Routes to Vercel

## What Changed
Added admin management endpoints to `backend/api/index.ts` for Vercel deployment:
- `POST /api/admin/add-admin` - Add admin role to a user
- `POST /api/admin/remove-admin` - Remove admin role from a user  
- `GET /api/admin/list-admins` - List all administrators
- `GET /api/admin/analytics` - Get platform analytics

## How to Deploy

### Option 1: Deploy via Vercel CLI (Recommended)
```bash
cd backend
vercel --prod
```

### Option 2: Deploy via Git Push
If your backend is connected to Vercel via GitHub:
```bash
cd backend
git add .
git commit -m "Add admin management endpoints"
git push origin main
```

Vercel will automatically deploy the changes.

### Option 3: Deploy via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Find your backend project (flippe-backend4)
3. Click "Deployments"
4. Click "Redeploy" on the latest deployment
5. Or push changes to your connected Git repository

## Verify Deployment

After deployment, test the endpoints:

### 1. Check Health
```bash
curl https://flippe-backend4.vercel.app/api/health
```

### 2. Test Admin Endpoints (requires authentication)
```bash
# List admins (must be logged in as super_admin)
curl https://flippe-backend4.vercel.app/api/admin/list-admins \
  -H "Cookie: auth_token=YOUR_TOKEN"

# Get analytics
curl https://flippe-backend4.vercel.app/api/admin/analytics \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

## Environment Variables Required

Make sure these are set in Vercel:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `JWT_SECRET` - Secret key for JWT tokens
- `FRONTEND_URL` - Your frontend URL (https://event-horizon-forecasts.vercel.app)
- `NODE_ENV` - Set to "production"

## Troubleshooting

### "Endpoint not found" error
- Make sure the backend is deployed with the latest changes
- Check Vercel deployment logs for errors
- Verify the API URL in frontend matches: `https://flippe-backend4.vercel.app`

### "Unauthorized" error
- Make sure you're logged in as a super_admin
- Check that your JWT token is valid
- Verify the primary super admin email is set correctly

### "User not found" error when adding admin
- The user must have an account first
- They need to sign up at the frontend before being granted admin privileges
- Verify the email address is correct

## Testing Locally

To test locally before deploying:
```bash
cd backend
npm install
npm run dev
```

Then update frontend `.env` to point to local backend:
```
VITE_API_URL=http://localhost:5000
```

## Next Steps

After deployment:
1. Log in to the frontend as the primary super admin (fehintoluwaolu@gmail.com)
2. Navigate to Super Admin Dashboard
3. Add admins by their email addresses (they must have accounts first)
4. Verify the admin list shows correctly
5. Test removing admins (except primary super admin)
