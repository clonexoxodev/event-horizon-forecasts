#!/bin/bash

echo "🚀 Deploying Frontend to Vercel..."
echo ""

cd event-horizon-forecasts-main

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building frontend..."
npm run build

echo ""
echo "🌐 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Frontend deployed!"
echo ""
echo "📝 Next steps:"
echo "1. Copy your frontend URL from the output above"
echo "2. Go to https://vercel.com/clonexoxodevs-projects/flippe-backend4"
echo "3. Go to Settings → Environment Variables"
echo "4. Add: FRONTEND_URL=<your-frontend-url>"
echo "5. Redeploy backend: cd backend && vercel --prod"
echo ""
echo "🎉 Done! Your app will be fully connected."
