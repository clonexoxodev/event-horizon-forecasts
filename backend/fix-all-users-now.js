#!/usr/bin/env node

/**
 * Fix ALL users' passwords in Supabase
 * This script updates passwords for all users with corrupted hashes
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const SUPABASE_URL = 'https://tuqvhmxefiepdcmqffvt.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cXZobXhlZmllcGRjbXFmZnZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2NTQ3MywiZXhwIjoyMDkzNjQxNDczfQ.JYRBMh7Dh3YypwyvMLHZ7X9oBN2xMjL5VsUYoGkdKAA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Password hashes
const TEMP_PASSWORD_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztP.eKzV7W.u'; // TempPass123!
const SUPER_ADMIN_PASSWORD_HASH = '$2b$12$KocWvp13JsRKNmVHrt9vr.Po01xDnh1VtUwTwUNnznqZdzNq9f/5e'; // fehin0706

async function fixAllUsers() {
  try {
    console.log('🔧 Fixing ALL user passwords...');
    console.log('');

    // Get all users
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, username, password_hash, role');

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError.message);
      process.exit(1);
    }

    console.log(`📊 Found ${users.length} users`);
    console.log('');

    let fixedCount = 0;
    let alreadyOkCount = 0;

    for (const user of users) {
      const isValidHash = user.password_hash && 
                         user.password_hash.startsWith('$2b$12$') && 
                         user.password_hash.length > 50;

      if (!isValidHash) {
        // Fix this user
        const newHash = user.email === 'fehintoluwaolu@gmail.com' 
          ? SUPER_ADMIN_PASSWORD_HASH 
          : TEMP_PASSWORD_HASH;

        const newRole = user.email === 'fehintoluwaolu@gmail.com'
          ? 'super_admin'
          : (user.role || 'user');

        const { error: updateError } = await supabase
          .from('users')
          .update({
            password_hash: newHash,
            role: newRole
          })
          .eq('id', user.id);

        if (updateError) {
          console.log(`❌ Failed to fix: ${user.email} - ${updateError.message}`);
        } else {
          console.log(`✅ Fixed: ${user.email} (${user.username})`);
          fixedCount++;
        }
      } else {
        console.log(`✓ OK: ${user.email} (${user.username})`);
        alreadyOkCount++;
      }
    }

    console.log('');
    console.log('📊 Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Fixed: ${fixedCount}`);
    console.log(`   Already OK: ${alreadyOkCount}`);
    console.log('');
    console.log('🔐 Login credentials:');
    console.log('');
    console.log('   Super Admin:');
    console.log('   Email: fehintoluwaolu@gmail.com');
    console.log('   Password: fehin0706');
    console.log('');
    console.log('   Other users:');
    console.log('   Email: (their email)');
    console.log('   Password: TempPass123!');
    console.log('');
    console.log('✅ Done! All users can now login.');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

fixAllUsers();
