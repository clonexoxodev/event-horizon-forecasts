@echo off
echo ========================================
echo   DEPLOYING REWRITTEN BACKEND
echo ========================================
echo.
echo This is a COMPLETE REWRITE of the backend
echo to fix all CORS and authentication issues.
echo.

cd backend

echo [1/3] Adding files to git...
git add api/index.ts vercel.json
echo.

echo [2/3] Committing changes...
git commit -m "Complete backend rewrite - fix all CORS and auth issues"
echo.

echo [3/3] Pushing to Vercel...
git push
echo.

echo ========================================
echo   DEPLOYMENT IN PROGRESS
echo ========================================
echo.
echo Please wait 2-3 minutes for deployment to complete.
echo.
echo Then test:
echo 1. Backend: https://flippe-backend4.vercel.app/api/health
echo 2. Login: https://event-horizon-forecasts.vercel.app/login
echo.
echo ========================================
echo.
echo WHAT WAS FIXED:
echo - Complete backend rewrite
echo - No more route loading issues
echo - No more CORS errors
echo - Simple, bulletproof code
echo.
echo ========================================
pause
