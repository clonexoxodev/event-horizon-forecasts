#!/bin/bash

# Deploy backend to Vercel
echo "🚀 Deploying Flippe Backend to Vercel..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy to production
echo "📦 Deploying to production..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Backend URL: https://flippe-backend4.vercel.app"
echo ""
echo "📝 Next steps:"
echo "1. Test the health endpoint: https://flippe-backend4.vercel.app/api/health"
echo "2. Log in to the frontend as super admin"
echo "3. Navigate to Super Admin Dashboard"
echo "4. Add admins by email"
echo ""
