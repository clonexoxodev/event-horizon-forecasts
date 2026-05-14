# Vercel Deployment Guide

## Environment Variables Required

Make sure to set these environment variables in your Vercel project settings:

### Required Variables
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)
- `SUPABASE_ANON_KEY` - Your Supabase anon key (fallback)
- `JWT_SECRET` - Secret key for JWT token generation
- `FRONTEND_URL` - Your frontend URL for CORS (e.g., https://yourdomain.com)

### Optional Variables
- `JWT_EXPIRES_IN` - JWT expiration time (default: 24h)
- `AWS_REGION` - AWS region for S3 uploads
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `S3_BUCKET` - S3 bucket name
- `EXCHANGE_API_URL` - Currency exchange API URL
- `EXCHANGE_API_KEY` - Currency exchange API key

## Deployment Steps

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   cd backend
   vercel
   ```

4. **Set Environment Variables**:
   - Go to your Vercel project dashboard
   - Navigate to Settings > Environment Variables
   - Add all required variables listed above

5. **Redeploy** after setting environment variables:
   ```bash
   vercel --prod
   ```

## API Endpoints

Once deployed, your API will be available at:
- Health Check: `https://your-domain.vercel.app/api/health`
- Root: `https://your-domain.vercel.app/api`
- Auth: `https://your-domain.vercel.app/api/auth/*`
- Wallet: `https://your-domain.vercel.app/api/wallet/*`
- Markets: `https://your-domain.vercel.app/api/markets/*`

## Troubleshooting

### Function Crashes
- Check Vercel logs: `vercel logs`
- Ensure all environment variables are set
- Verify Supabase credentials are correct

### CORS Issues
- Make sure `FRONTEND_URL` is set correctly
- Check that your frontend domain is whitelisted

### Database Connection Issues
- Verify Supabase URL and keys
- Check Supabase project is active
- Ensure RLS policies are configured correctly

## Local Testing

To test the serverless function locally:
```bash
vercel dev
```

This will start a local development server that mimics Vercel's serverless environment.
