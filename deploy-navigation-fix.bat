@echo off
echo ========================================
echo   DEPLOYING NAVIGATION FIX
echo ========================================
echo.
echo Changes:
echo - Added mobile bottom navigation
echo - Created More page with menu
echo - Added MobileNav to all pages
echo - Fixed mobile responsiveness
echo.

cd event-horizon-forecasts-main

echo [1/3] Adding files to git...
git add src/
echo.

echo [2/3] Committing changes...
git commit -m "Add mobile bottom navigation and More page for better mobile UX"
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
echo Test on mobile:
echo - Bottom nav should appear
echo - Home, Portfolio, Wallet, More tabs
echo - More page with organized menu
echo - All navigation working
echo.
echo ========================================
pause
