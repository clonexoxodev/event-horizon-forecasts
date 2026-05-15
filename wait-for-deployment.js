#!/usr/bin/env node

/**
 * Wait for Deployment Script
 * Polls the backend health endpoint until the new version is deployed
 */

const https = require('https');

const BACKEND_URL = 'https://flippe-backend4.vercel.app';
const TARGET_VERSION = '2.2.0-cross-domain-cookies';
const CHECK_INTERVAL = 5000; // 5 seconds
const MAX_ATTEMPTS = 36; // 3 minutes total

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkHealth() {
  return new Promise((resolve, reject) => {
    https.get(`${BACKEND_URL}/api/health`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function waitForDeployment() {
  log('\n⏳ Waiting for deployment...', 'cyan');
  log(`Target version: ${TARGET_VERSION}\n`, 'cyan');

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const health = await checkHealth();
      
      log(`[${attempt}/${MAX_ATTEMPTS}] Current version: ${health.version}`, 'yellow');
      
      if (health.version === TARGET_VERSION) {
        log('\n🎉 DEPLOYMENT COMPLETE!', 'green');
        log(`✅ Version: ${health.version}`, 'green');
        log(`✅ Cookie Settings: ${health.cookieSettings}`, 'green');
        log('\n🚀 Production login should now work!', 'green');
        log('\nTest it at: https://event-horizon-forecasts.vercel.app/login\n', 'cyan');
        return true;
      }
      
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
      }
    } catch (error) {
      log(`[${attempt}/${MAX_ATTEMPTS}] Error checking health: ${error.message}`, 'yellow');
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
      }
    }
  }
  
  log('\n⚠️  Deployment taking longer than expected', 'yellow');
  log('This is normal for Vercel deployments.', 'yellow');
  log('\nYou can:', 'cyan');
  log('1. Wait a few more minutes and try again', 'cyan');
  log('2. Check Vercel dashboard for deployment status', 'cyan');
  log('3. Use localhost for your demo: http://localhost:8080\n', 'cyan');
  
  return false;
}

waitForDeployment()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
