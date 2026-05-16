#!/usr/bin/env node

const https = require('https');

const BACKEND_URL = 'https://flippe-backend4.vercel.app';
const TEST_EMAIL = 'fehintoluwaolu@gmail.com';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
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

async function checkUserRole() {
  console.log('\n🔍 Checking User Role\n');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/debug/check-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: TEST_EMAIL })
    });
    
    if (response.status === 200 && response.data.exists) {
      console.log('✅ User found:');
      console.log('   Email:', response.data.user.email);
      console.log('   Username:', response.data.user.username);
      console.log('   ID:', response.data.user.id);
      console.log('   Created:', response.data.user.createdAt);
      console.log('\n📋 Checking role in database...');
      console.log('   Note: The debug endpoint doesn\'t return role.');
      console.log('   You need to check the database directly.\n');
      
      console.log('🔧 To fix the role, run this SQL in Supabase:');
      console.log('');
      console.log('UPDATE users');
      console.log('SET role = \'super_admin\'');
      console.log(`WHERE email = '${TEST_EMAIL}';`);
      console.log('');
      console.log('Then verify with:');
      console.log('');
      console.log('SELECT id, email, username, role');
      console.log('FROM users');
      console.log(`WHERE email = '${TEST_EMAIL}';`);
      console.log('');
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUserRole();
