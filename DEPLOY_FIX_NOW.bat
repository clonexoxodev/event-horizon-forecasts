@echo off
echo ========================================
echo   DEPLOYING CORS FIX TO BACKEND
echo ========================================
echo.

cd backend

echo Step 1: Adding files to git...
git add .

echo.
echo Step 2: Committing changes...
git commit -m "Fix CORS issue completely - allow frontend origin"

echo.
echo Step 3: Pushing to trigger deployment...
git push

echo.
echo ========================================
echo   DEPLOYMENT TRIGGERED!
echo ========================================
echo.
echo Wait 60 seconds, then test login at:
echo https://event-horizon-forecasts.vercel.app/login
echo.
echo Press any key to exit...
pause >nul
