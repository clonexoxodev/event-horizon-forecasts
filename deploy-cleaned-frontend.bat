@echo off
echo ========================================
echo   DEPLOYING CLEANED FRONTEND
echo ========================================
echo.
echo Changes:
echo - Removed all fake/demo data
echo - Removed gambling language
echo - Added clean empty states
echo.

cd event-horizon-forecasts-main

echo [1/3] Adding files to git...
git add src/
echo.

echo [2/3] Committing changes...
git commit -m "Clean app: remove fake data and replace gambling language with forecast terminology"
echo.

echo [3/3] Pushing to Vercel...
git push
echo.

echo ========================================
echo   DEPLOYMENT INITIATED
echo ========================================
echo.
echo Wait 2-3 minutes, then check:
echo https://event-horizon-forecasts.vercel.app
echo.
echo You should see:
echo - No fake markets
echo - No fake positions
echo - No fake transactions
echo - Clean empty states
echo - "Forecast" instead of "bet"
echo.
echo ========================================
pause
