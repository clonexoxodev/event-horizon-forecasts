#!/usr/bin/env node

/**
 * EMERGENCY PASSWORD FIX
 * 
 * This script immediately fixes the super admin password in the database
 * Run: node emergency-fix-password.js
 */

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EMAIL = 'fehintoluwaolu@gmail.com';
const PASSWORD = 'fehin0706';

async function fixPassword() {
  console.log('🚨 EMERGENCY PASSWORD FIX\n');
  console.log('Email:', EMAIL);
  console.log('Password:', PASSWORD);
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Generate new hash with bcryptjs
    console.log('1. Generating password hash with bcryptjs...');
    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    console.log('✅ Hash generated:', passwordHash.substring(0, 20) + '...');
    console.log('   Hash length:', passwordHash.length);
    console.log('   Hash type:', passwordHash.substring(0, 4));
    console.log('');

    // Update database
    console.log('2. Updating database...');
    const { data, error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        role: 'super_admin'
      })
      .eq('email', EMAIL)
      .select();

    if (error) {
      console.error('❌ Database update failed:', error);
      process.exit(1);
    }

    console.log('✅ Database updated successfully');
    console.log('');

    // Verify
    console.log('3. Verifying update...');
    const { data: user, error: verifyError } = await supabase
      .from('users')
      .select('email, role, password_hash')
      .eq('email', EMAIL)
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      process.exit(1);
    }

    console.log('✅ Verification successful');
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Hash:', user.password_hash.substring(0, 20) + '...');
    console.log('   Hash length:', user.password_hash.length);
    console.log('');

    // Test password
    console.log('4. Testing password...');
    const isValid = await bcrypt.compare(PASSWORD, user.password_hash);
    
    if (isValid) {
      console.log('✅ Password test PASSED');
      console.log('');
      console.log('='.repeat(60));
      console.log('\n🎉 SUCCESS! Password fixed and verified!\n');
      console.log('You can now login with:');
      console.log('  Email:', EMAIL);
      console.log('  Password:', PASSWORD);
      console.log('');
      console.log('Wait 1-2 minutes for Vercel deployment, then try login.');
      console.log('');
    } else {
      console.log('❌ Password test FAILED');
      console.log('');
      console.log('Something went wrong. The hash was updated but password verification failed.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixPassword();
