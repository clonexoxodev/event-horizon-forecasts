#!/usr/bin/env node

const BACKEND_URL = 'https://flippe-backend4.vercel.app';
const EMAIL = 'fehintoluwaolu@gmail.com';
const PASSWORD = 'fehin0706';

console.log('🧪 TESTING BACKEND NOW\n');

async function test() {
  // Test 1: Health
  console.log('1. Health Check...');
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    const data = await res.json();
    console.log('✅ Status:', res.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
  console.log('');

  // Test 2: Check User
  console.log('2. Check User...');
  try {
    const res = await fetch(`${BACKEND_URL}/api/debug/check-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL })
    });
    const data = await res.json();
    console.log('✅ Status:', res.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
  console.log('');

  // Test 3: Login
  console.log('3. Login...');
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (res.ok) {
      console.log('\n🎉 LOGIN WORKS!');
    } else {
      console.log('\n❌ LOGIN FAILED');
      console.log('Error:', data.error?.message || 'Unknown error');
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
}

test();
