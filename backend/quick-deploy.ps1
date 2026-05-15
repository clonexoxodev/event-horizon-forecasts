# Quick Deploy Script for Backend (PowerShell)
# This script commits and pushes backend changes to trigger Vercel deployment

Write-Host "🚀 Quick Deploy Backend to Vercel" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "api/index.ts")) {
    Write-Host "❌ Error: Must run from backend directory" -ForegroundColor Red
    Write-Host "   cd backend; .\quick-deploy.ps1" -ForegroundColor Yellow
    exit 1
}

# Check if there are changes to commit
$changes = git diff --quiet api/index.ts
if ($LASTEXITCODE -eq 0) {
    Write-Host "ℹ️  No changes detected in api/index.ts" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  1. Make changes to api/index.ts first"
    Write-Host "  2. Or redeploy via Vercel Dashboard:"
    Write-Host "     https://vercel.com/dashboard → flippe-backend4 → Redeploy"
    exit 0
}

Write-Host "📝 Changes detected in api/index.ts" -ForegroundColor Green
Write-Host ""

# Show changes
Write-Host "Changes to be deployed:" -ForegroundColor Cyan
Write-Host "----------------------" -ForegroundColor Cyan
git diff api/index.ts | Select-Object -First 20
Write-Host ""
Write-Host "(showing first 20 lines, use 'git diff api/index.ts' to see all)" -ForegroundColor Gray
Write-Host ""

# Confirm deployment
$confirmation = Read-Host "Deploy these changes? (y/n)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 0
}

# Commit and push
Write-Host ""
Write-Host "📦 Committing changes..." -ForegroundColor Cyan
git add api/index.ts

# Generate commit message
$commitMsg = "fix: Update backend API with login fixes and error logging"
git commit -m $commitMsg

Write-Host ""
Write-Host "🚀 Pushing to remote..." -ForegroundColor Cyan
git push origin main

Write-Host ""
Write-Host "✅ Pushed to GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Vercel will automatically deploy in 1-2 minutes" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Watch deployment: https://vercel.com/dashboard"
Write-Host "  2. Wait for 'Ready' status (1-2 min)"
Write-Host "  3. Test login: node test-login-after-deploy.js"
Write-Host ""
Write-Host "🎯 Deployment initiated!" -ForegroundColor Green
