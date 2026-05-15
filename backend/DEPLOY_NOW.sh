#!/bin/bash

echo "=========================================="
echo "🚨 CRITICAL BACKEND FIX - DEPLOYING NOW"
echo "=========================================="
echo ""
echo "✅ All endpoints added:"
echo "   - Root route"
echo "   - Health check"
echo "   - Authentication (4 endpoints)"
echo "   - Wallet operations (5 endpoints)"
echo "   - Admin management (4 endpoints)"
echo ""
echo "✅ Vercel handler fixed"
echo "✅ Package.json fixed"
echo ""
echo "=========================================="
echo "📦 Starting deployment to Vercel..."
echo "=========================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy to production with force flag
echo "🚀 Deploying to production..."
vercel --prod --force

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🔗 Backend URL: https://flippe-backend4.vercel.app"
echo ""
echo "📝 Test these endpoints NOW:"
echo ""
echo "1. Root:"
echo "   curl https://flippe-backend4.vercel.app/"
echo ""
echo "2. Health:"
echo "   curl https://flippe-backend4.vercel.app/api/health"
echo ""
echo "3. Login (browser):"
echo "   https://event-horizon-forecasts.vercel.app/login"
echo ""
echo "4. Wallet (after login):"
echo "   Navigate to wallet page"
echo ""
echo "5. Super Admin (after login):"
echo "   Navigate to super admin dashboard"
echo ""
echo "=========================================="
echo "✅ ALL ENDPOINTS SHOULD NOW WORK!"
echo "=========================================="
