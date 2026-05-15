#!/usr/bin/env node

/**
 * Test Login After Deployment
 * 
 * This script tests the login functionality after backend deployment
 * Run: node test-login-after-deploy.js
 */

const BACKEND_URL = 'https://flippe-backend4.vercel.app';
const TEST_EMAIL = 'fehintoluwaolu@gmail.com';
const TEST_PASSWORD = 'fehin0706';

console.log('🧪 Testing Backend After Deployment\n');
console.log('Backend URL:', BACKEND_URL);
console.log('Test Email:', TEST_EMAIL);
console.log('Test Password:', TEST_PASSWORD);
console.log('\n' + '='.repeat(60) + '\n');

async function test1_HealthCheck() {
  console.log('Test 1: Health Check');
  console.log('-------------------');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.status === 'ok') {
      console.log('✅ Health check passed\n');
      return true;
    } else {
      console.log('❌ Health check failed\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    console.log('');
    return false;
  }
}

async function test2_CheckUser() {
  console.log('Test 2: Check User Exists');
  console.log('-------------------------');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/debug/check-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: TEST_EMAIL })
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.exists && data.user?.hashStatus === 'Valid bcrypt hash') {
      console.log('✅ User exists with valid password hash\n');
      return true;
    } else {
      console.log('❌ User check failed\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Check user error:', error.message);
    console.log('');
    return false;
  }
}

async function test3_Login() {
  console.log('Test 3: Login');
  console.log('-------------');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.user) {
      console.log('✅ Login successful!\n');
      return true;
    } else {
      console.log('❌ Login failed\n');
      
      if (response.status === 500) {
        console.log('⚠️  500 Internal Server Error detected!');
        console.log('This means:');
        console.log('  1. Backend is deployed but has a runtime error');
        console.log('  2. Check Vercel deployment logs for details');
        console.log('  3. Possible causes:');
        console.log('     - Bcrypt not working in Vercel environment');
        console.log('     - Missing environment variables');
        console.log('     - Database connection issue');
        console.log('');
      }
      
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    console.log('');
    return false;
  }
}

async function test4_PasswordReset() {
  console.log('Test 4: Password Reset Endpoint');
  console.log('--------------------------------');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        newPassword: TEST_PASSWORD
      })
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('✅ Password reset endpoint works\n');
      return true;
    } else {
      console.log('❌ Password reset failed\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Password reset error:', error.message);
    console.log('');
    return false;
  }
}

async function runAllTests() {
  console.log('Starting tests...\n');
  
  const results = {
    healthCheck: await test1_HealthCheck(),
    checkUser: await test2_CheckUser(),
    login: await test3_Login(),
    passwordReset: await test4_PasswordReset()
  };
  
  console.log('='.repeat(60));
  console.log('\n📊 Test Results Summary\n');
  console.log('Health Check:     ', results.healthCheck ? '✅ PASS' : '❌ FAIL');
  console.log('Check User:       ', results.checkUser ? '✅ PASS' : '❌ FAIL');
  console.log('Login:            ', results.login ? '✅ PASS' : '❌ FAIL');
  console.log('Password Reset:   ', results.passwordReset ? '✅ PASS' : '❌ FAIL');
  console.log('');
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Login is working!\n');
    console.log('Next steps:');
    console.log('  1. Test login via frontend: https://event-horizon-forecasts.vercel.app/login');
    console.log('  2. Email: fehintoluwaolu@gmail.com');
    console.log('  3. Password: fehin0706');
    console.log('');
  } else {
    console.log('⚠️  SOME TESTS FAILED\n');
    
    if (!results.healthCheck) {
      console.log('❌ Backend is not responding. Check:');
      console.log('   - Vercel deployment status');
      console.log('   - Backend URL is correct');
      console.log('');
    }
    
    if (results.healthCheck && !results.checkUser) {
      console.log('❌ User check failed. Check:');
      console.log('   - Database connection');
      console.log('   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
      console.log('   - User exists in database');
      console.log('');
    }
    
    if (results.checkUser && !results.login) {
      console.log('❌ Login failed but user exists. Check:');
      console.log('   - Vercel deployment logs for errors');
      console.log('   - Bcrypt compatibility in Vercel');
      console.log('   - JWT_SECRET environment variable');
      console.log('   - Password is correct: fehin0706');
      console.log('');
      console.log('🔍 How to check Vercel logs:');
      console.log('   1. Go to: https://vercel.com/dashboard');
      console.log('   2. Click: flippe-backend4 project');
      console.log('   3. Click: Deployments → Latest → Functions → /api/index');
      console.log('   4. Click: Logs');
      console.log('   5. Try login again and watch logs in real-time');
      console.log('');
    }
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
