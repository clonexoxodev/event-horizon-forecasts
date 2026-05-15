#!/usr/bin/env node

/**
 * FIX ALL USERS PASSWORDS WITH BCRYPTJS
 * 
 * This script fixes ALL users' passwords to work with bcryptjs
 * Run: node fix-all-passwords-bcryptjs.js
 */

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Default password for all users
const DEFAULT_PASSWORD = 'TempPass123!';

async function fixAllPasswords() {
  console.log('🚨 FIXING ALL USERS PASSWORDS WITH BCRYPTJS\n');
  console.log('Default Password:', DEFAULT_PASSWORD);
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Get all users
    console.log('1. Fetching all users...');
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, username, role');

    if (fetchError) {
      console.error('❌ Failed to fetch users:', fetchError);
      process.exit(1);
    }

    console.log(`✅ Found ${users.length} users`);
    console.log('');

    // Generate hash once (same for all users)
    console.log('2. Generating password hash with bcryptjs...');
    const defaultHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    console.log('✅ Hash generated:', defaultHash.substring(0, 20) + '...');
    console.log('');

    // Update all users
    console.log('3. Updating all users...');
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        // Special handling for super admin
        const password = user.email === 'fehintoluwaolu@gmail.com' ? 'fehin0706' : DEFAULT_PASSWORD;
        const hash = user.email === 'fehintoluwaolu@gmail.com' 
          ? await bcrypt.hash('fehin0706', 12)
          : defaultHash;

        const { error } = await supabase
          .from('users')
          .update({ password_hash: hash })
          .eq('id', user.id);

        if (error) {
          console.log(`❌ Failed: ${user.email} - ${error.message}`);
          failCount++;
        } else {
          console.log(`✅ Updated: ${user.email} (${user.role || 'user'})`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Error: ${user.email} - ${err.message}`);
        failCount++;
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('\n📊 Summary\n');
    console.log(`Total Users: ${users.length}`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('');

    if (successCount === users.length) {
      console.log('🎉 ALL USERS FIXED!\n');
      console.log('Credentials:');
      console.log('  Super Admin:');
      console.log('    Email: fehintoluwaolu@gmail.com');
      console.log('    Password: fehin0706');
      console.log('');
      console.log('  All Other Users:');
      console.log('    Password: TempPass123!');
      console.log('');
      console.log('Users can now login or use password reset page.');
      console.log('');
    } else {
      console.log('⚠️  Some users failed to update. Check errors above.');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixAllPasswords();
