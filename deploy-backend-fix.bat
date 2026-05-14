@echo off
echo ========================================
echo   DEPLOYING BACKEND FIX TO VERCEL
echo ========================================
echo.

cd backend

echo [1/4] Adding files to git...
git add api/index.ts vercel.json
echo.

echo [2/4] Committing changes...
git commit -m "Fix CORS and route loading for production"
echo.

echo [3/4] Pushing to Vercel...
git push
echo.

echo [4/4] Deployment initiated!
echo.
echo ========================================
echo   DEPLOYMENT IN PROGRESS
echo ========================================
echo.
echo Please wait 2-3 minutes for deployment to complete.
echo.
echo Then test:
echo 1. Health: https://flippe-backend4-git-main-clonexoxodevs-projects.vercel.app/api/health
echo 2. Login: https://event-horizon-forecasts.vercel.app/login
echo.
echo ========================================
pause
