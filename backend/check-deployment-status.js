#!/usr/bin/env node

/**
 * Check Deployment Status
 * 
 * This script checks if the backend deployment is complete and ready
 * Run: node check-deployment-status.js
 */

const BACKEND_URL = 'https://flippe-backend4.vercel.app';

console.log('🔍 Checking Backend Deployment Status\n');
console.log('Backend URL:', BACKEND_URL);
console.log('Checking every 10 seconds...\n');
console.log('Press Ctrl+C to stop\n');
console.log('='.repeat(60) + '\n');

let checkCount = 0;
const maxChecks = 30; // 5 minutes max

async function checkStatus() {
  checkCount++;
  const timestamp = new Date().toLocaleTimeString();
  
  console.log(`[${timestamp}] Check #${checkCount}/${maxChecks}`);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      console.log('✅ Backend is READY!\n');
      console.log('Response:', JSON.stringify(data, null, 2));
      console.log('\n' + '='.repeat(60));
      console.log('\n🎉 DEPLOYMENT COMPLETE!\n');
      console.log('Next steps:');
      console.log('  1. Run: node backend/test-login-after-deploy.js');
      console.log('  2. Test login at: https://event-horizon-forecasts.vercel.app/login');
      console.log('  3. Email: fehintoluwaolu@gmail.com');
      console.log('  4. Password: fehin0706');
      console.log('');
      process.exit(0);
    } else {
      console.log('⏳ Backend responding but not ready yet...');
      console.log('   Status:', data.status || 'unknown');
      console.log('');
    }
  } catch (error) {
    console.log('⏳ Backend not responding yet...');
    console.log('   Error:', error.message);
    console.log('   (This is normal during deployment)');
    console.log('');
  }
  
  if (checkCount >= maxChecks) {
    console.log('⚠️  Max checks reached (5 minutes)');
    console.log('');
    console.log('Deployment might be taking longer than expected.');
    console.log('');
    console.log('Please check:');
    console.log('  1. Vercel Dashboard: https://vercel.com/dashboard');
    console.log('  2. Look for flippe-backend4 project');
    console.log('  3. Check Deployments tab for status');
    console.log('  4. Look for any error messages');
    console.log('');
    process.exit(1);
  }
  
  // Check again in 10 seconds
  setTimeout(checkStatus, 10000);
}

// Start checking
checkStatus();
