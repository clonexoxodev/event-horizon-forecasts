@echo off
echo ========================================
echo   DEPLOYING REWRITTEN BACKEND
echo ========================================
echo.
echo This is a COMPLETE REWRITE of the backend.
echo All auth logic is now in ONE file.
echo No more import issues!
echo.

cd backend

echo [1/3] Adding files to git...
git add api/index.ts vercel.json
echo.

echo [2/3] Committing changes...
git commit -m "Complete backend rewrite - all auth in one file, no imports"
echo.

echo [3/3] Pushing to Vercel...
git push
echo.

echo ========================================
echo   DEPLOYMENT INITIATED
echo ========================================
echo.
echo Wait 2-3 minutes, then test:
echo.
echo 1. Health check:
echo    https://flippe-backend4.vercel.app/api/health
echo.
echo 2. Login test:
echo    https://event-horizon-forecasts.vercel.app/login
echo.
echo ========================================
pause
