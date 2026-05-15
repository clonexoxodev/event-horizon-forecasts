#!/usr/bin/env node

/**
 * Production Readiness Verification Script
 * Tests all critical endpoints to ensure platform is ready for demo
 */

const https = require('https');

const BACKEND_URL = 'https://flippe-backend4.vercel.app';
const FRONTEND_URL = 'https://event-horizon-forecasts.vercel.app';
const TEST_EMAIL = 'fehintoluwaolu@gmail.com';
const TEST_PASSWORD = 'fehin0706';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testHealthCheck() {
  log('\n1️⃣  Testing Backend Health Check...', 'cyan');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/health`);
    
    if (response.status === 200) {
      log('✅ Health check passed', 'green');
      log(`   Version: ${response.data.version}`, 'blue');
      log(`   bcrypt: ${response.data.bcryptVersion}`, 'blue');
      
      if (response.data.version === '2.1.0-bcryptjs' && response.data.bcryptVersion === 'bcryptjs') {
        log('✅ Correct version deployed!', 'green');
        return true;
      } else {
        log('⚠️  Old version still deployed', 'yellow');
        return false;
      }
    } else {
      log(`❌ Health check failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, 'red');
    return false;
  }
}

async function testUserCheck() {
  log('\n2️⃣  Testing User Verification...', 'cyan');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/debug/check-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: TEST_EMAIL })
    });
    
    if (response.status === 200 && response.data.exists) {
      log('✅ User exists', 'green');
      log(`   Email: ${response.data.user.email}`, 'blue');
      log(`   Hash Status: ${response.data.user.hashStatus}`, 'blue');
      
      if (response.data.user.hashStatus === 'Valid bcrypt hash') {
        log('✅ Password hash is valid!', 'green');
        return true;
      } else {
        log('❌ Password hash is invalid', 'red');
        return false;
      }
    } else {
      log(`❌ User check failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ User check error: ${error.message}`, 'red');
    return false;
  }
}

async function testLogin() {
  log('\n3️⃣  Testing Login...', 'cyan');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });
    
    if (response.status === 200) {
      log('✅ Login successful!', 'green');
      log(`   User: ${response.data.user.username}`, 'blue');
      log(`   Email: ${response.data.user.email}`, 'blue');
      return true;
    } else {
      log(`❌ Login failed: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Login error: ${error.message}`, 'red');
    return false;
  }
}

async function testFrontend() {
  log('\n4️⃣  Testing Frontend Deployment...', 'cyan');
  
  try {
    const response = await makeRequest(FRONTEND_URL);
    
    if (response.status === 200) {
      log('✅ Frontend is accessible', 'green');
      return true;
    } else {
      log(`⚠️  Frontend returned: ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Frontend error: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n🔍 PRODUCTION READINESS CHECK', 'cyan');
  log('================================\n', 'cyan');
  
  const results = {
    health: await testHealthCheck(),
    user: await testUserCheck(),
    login: await testLogin(),
    frontend: await testFrontend()
  };
  
  log('\n📊 RESULTS', 'cyan');
  log('================================', 'cyan');
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    log('\n🎉 ALL TESTS PASSED!', 'green');
    log('✅ Backend: READY', 'green');
    log('✅ Login: WORKING', 'green');
    log('✅ Frontend: DEPLOYED', 'green');
    log('\n🚀 PLATFORM IS READY FOR INVESTOR DEMO!', 'green');
  } else {
    log('\n⚠️  SOME TESTS FAILED', 'yellow');
    
    if (!results.health) {
      log('❌ Backend health check failed - old version may still be cached', 'red');
      log('   Wait 2-3 minutes and try again', 'yellow');
    }
    
    if (!results.user) {
      log('❌ User verification failed - database issue', 'red');
    }
    
    if (!results.login) {
      log('❌ Login failed - authentication issue', 'red');
      log('   This is the critical issue preventing demo', 'red');
    }
    
    if (!results.frontend) {
      log('⚠️  Frontend not accessible - deployment issue', 'yellow');
    }
    
    log('\n💡 RECOMMENDATION:', 'cyan');
    if (!results.login && results.health && results.user) {
      log('   Backend is correct but login fails - likely a frontend cache issue', 'yellow');
      log('   Use localhost for demo: http://localhost:8080', 'green');
    } else if (!results.health) {
      log('   Wait 2-3 minutes for deployment to complete', 'yellow');
      log('   Then run this script again', 'yellow');
    } else {
      log('   Use localhost for demo: http://localhost:8080', 'green');
    }
  }
  
  log('\n================================\n', 'cyan');
  
  return allPassed;
}

// Run tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
