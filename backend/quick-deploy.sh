#!/bin/bash

# Quick Deploy Script for Backend
# This script commits and pushes backend changes to trigger Vercel deployment

echo "🚀 Quick Deploy Backend to Vercel"
echo "=================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "api/index.ts" ]; then
    echo "❌ Error: Must run from backend directory"
    echo "   cd backend && ./quick-deploy.sh"
    exit 1
fi

# Check if there are changes to commit
if git diff --quiet api/index.ts; then
    echo "ℹ️  No changes detected in api/index.ts"
    echo ""
    echo "Options:"
    echo "  1. Make changes to api/index.ts first"
    echo "  2. Or redeploy via Vercel Dashboard:"
    echo "     https://vercel.com/dashboard → flippe-backend4 → Redeploy"
    exit 0
fi

echo "📝 Changes detected in api/index.ts"
echo ""

# Show changes
echo "Changes to be deployed:"
echo "----------------------"
git diff api/index.ts | head -20
echo ""
echo "(showing first 20 lines, use 'git diff api/index.ts' to see all)"
echo ""

# Confirm deployment
read -p "Deploy these changes? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

# Commit and push
echo ""
echo "📦 Committing changes..."
git add api/index.ts

# Generate commit message
COMMIT_MSG="fix: Update backend API with login fixes and error logging"
git commit -m "$COMMIT_MSG"

echo ""
echo "🚀 Pushing to remote..."
git push origin main

echo ""
echo "✅ Pushed to GitHub!"
echo ""
echo "📊 Vercel will automatically deploy in 1-2 minutes"
echo ""
echo "Next steps:"
echo "  1. Watch deployment: https://vercel.com/dashboard"
echo "  2. Wait for 'Ready' status (1-2 min)"
echo "  3. Test login: node test-login-after-deploy.js"
echo ""
echo "🎯 Deployment initiated!"
