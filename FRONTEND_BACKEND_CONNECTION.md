# Frontend-Backend Connection Guide

## ✅ What I've Done

1. **Updated Frontend Environment Variables**
   - Changed `VITE_API_URL` to point to your deployed backend
   - Backend URL: `https://flippe-backend4-git-main-clonexoxodevs-projects.vercel.app`

2. **Updated API Service**
   - Updated default API URL in `event-horizon-forecasts-main/src/lib/api.ts`
   - Now uses production backend by default

## 🚀 Next Steps

### Step 1: Deploy Your Frontend to Vercel

```bash
cd event-horizon-forecasts-main
vercel
```

After deployment, you'll get a URL like:
`https://your-frontend.vercel.app`

### Step 2: Update Backend CORS Settings

Once you have your frontend URL, you need to update the backend environment variables in Vercel:

1. Go to your backend Vercel project: https://vercel.com/clonexoxodevs-projects/flippe-backend4
2. Go to **Settings** → **Environment Variables**
3. Add or update:
   ```
   FRONTEND_URL=https://your-frontend.vercel.app
   ```
4. Redeploy the backend:
   ```bash
   cd backend
   vercel --prod
   ```

### Step 3: Test the Connection

After both are deployed, test the connection:

```bash
# Test from your browser console on the frontend
fetch('https://flippe-backend4-git-main-clonexoxodevs-projects.vercel.app/api/health')
  .then(r => r.json())
  .then(console.log)
```

## 🔧 Local Development

For local development, you have two options:

### Option 1: Use Production Backend (Recommended)
Your frontend is already configured to use the production backend.

```bash
cd event-horizon-forecasts-main
npm run dev
```

### Option 2: Use Local Backend
If you want to test with a local backend:

1. Update `.env`:
   ```
   VITE_API_URL=http://localhost:5004
   ```

2. Start backend locally:
   ```bash
   cd backend
   npm run dev
   ```

3. Start frontend:
   ```bash
   cd event-horizon-forecasts-main
   npm run dev
   ```

## 📝 Environment Variables Summary

### Frontend (.env)
```env
VITE_API_URL=https://flippe-backend4-git-main-clonexoxodevs-projects.vercel.app
VITE_SUPABASE_URL=https://tuqvhmxefiepdcmqffvt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend (Vercel Dashboard)
```env
SUPABASE_URL=https://tuqvhmxefiepdcmqffvt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-secret-key
FRONTEND_URL=https://your-frontend.vercel.app
```

## 🧪 Testing Endpoints

Once connected, you can test these endpoints from your frontend:

### Health Check
```javascript
import { apiService } from './lib/api';

const health = await apiService.healthCheck();
console.log(health);
```

### Authentication
```javascript
// Sign up
const result = await apiService.signup({
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123'
});

// Login
const loginResult = await apiService.login({
  email: 'test@example.com',
  password: 'password123'
});
```

### Wallet Operations
```javascript
// Get wallet
const wallet = await apiService.getWallet();

// Deposit
const deposit = await apiService.deposit(1000, 'NGN');

// Get transactions
const transactions = await apiService.getTransactions();
```

## 🐛 Troubleshooting

### CORS Errors
If you see CORS errors:
1. Make sure `FRONTEND_URL` is set in backend Vercel environment variables
2. Make sure it matches your frontend URL exactly (no trailing slash)
3. Redeploy the backend after updating

### 401 Unauthorized
- Make sure you're logged in
- Check that cookies are being sent (credentials: 'include' is set)
- Verify JWT_SECRET is set in backend

### Connection Refused
- Verify backend is deployed and running
- Check the backend URL is correct in frontend .env
- Test backend directly: `curl https://flippe-backend4-git-main-clonexoxodevs-projects.vercel.app/api/health`

## 📚 API Endpoints Available

- `GET /api` - Root endpoint
- `GET /api/health` - Health check
- `POST /api/auth/signup` - Sign up
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `GET /api/wallet` - Get wallet
- `POST /api/wallet/deposit` - Deposit funds
- `POST /api/wallet/withdraw` - Withdraw funds
- `GET /api/wallet/transactions` - Get transactions
- `GET /api/wallet/convert` - Convert currency
- `GET /api/markets` - Get all markets
- `GET /api/markets/:id` - Get market by ID

## ✅ Checklist

- [x] Frontend .env updated with production backend URL
- [x] API service updated with production URL
- [ ] Frontend deployed to Vercel
- [ ] Backend FRONTEND_URL environment variable updated
- [ ] Backend redeployed with new FRONTEND_URL
- [ ] Connection tested from frontend

## 🎉 You're Ready!

Your frontend is now configured to connect to your deployed backend. Just deploy the frontend and update the backend CORS settings, and you're good to go!
