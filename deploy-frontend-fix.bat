@echo off
echo ========================================
echo   DEPLOYING FRONTEND FIX TO VERCEL
echo ========================================
echo.

cd event-horizon-forecasts-main

echo [1/3] Adding files to git...
git add .env src/lib/api.ts
echo.

echo [2/3] Committing changes...
git commit -m "Fix: Use production backend URL without auth protection"
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
echo Then test login at:
echo https://event-horizon-forecasts.vercel.app/login
echo.
echo Backend is now at:
echo https://flippe-backend4.vercel.app
echo.
echo ========================================
pause
