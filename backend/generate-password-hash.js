#!/usr/bin/env node

/**
 * Generate bcrypt password hash
 * Usage: node generate-password-hash.js "YourPassword123!"
 */

const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Password required');
  console.log('');
  console.log('Usage: node generate-password-hash.js "YourPassword123!"');
  console.log('');
  process.exit(1);
}

async function generateHash() {
  try {
    console.log('🔐 Generating bcrypt hash...');
    console.log('');
    
    const hash = await bcrypt.hash(password, 12);
    
    console.log('✅ Password hash generated successfully!');
    console.log('');
    console.log('Password:', password);
    console.log('');
    console.log('Hash:', hash);
    console.log('');
    console.log('📋 Copy this hash and use it in Supabase SQL:');
    console.log('');
    console.log(`INSERT INTO users (username, email, password_hash, role)`);
    console.log(`VALUES (`);
    console.log(`  'fehintoluwa',`);
    console.log(`  'fehintoluwaolu@gmail.com',`);
    console.log(`  '${hash}',`);
    console.log(`  'super_admin'`);
    console.log(`);`);
    console.log('');
  } catch (error) {
    console.error('❌ Error generating hash:', error.message);
    process.exit(1);
  }
}

generateHash();
