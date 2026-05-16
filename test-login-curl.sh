#!/bin/bash

echo "🔍 Testing Production Login with curl"
echo "======================================"
echo ""

echo "1. Testing login endpoint..."
curl -v -X POST https://flippe-backend4.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://event-horizon-forecasts.vercel.app" \
  -d '{"email":"fehintoluwaolu@gmail.com","password":"fehin0706"}' \
  2>&1 | tee login-response.txt

echo ""
echo ""
echo "2. Checking for Set-Cookie header..."
grep -i "set-cookie" login-response.txt || echo "❌ No Set-Cookie header found"

echo ""
echo "3. Checking response status..."
grep -i "< HTTP" login-response.txt

echo ""
echo "Done! Check login-response.txt for full details."
