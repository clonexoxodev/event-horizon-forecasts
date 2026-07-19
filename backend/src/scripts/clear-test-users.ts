#!/usr/bin/env tsx
/**
 * Script to clear test users from the database
 * Usage: npm run clear-test-users
 * 
 * SAFETY: This script requires a CONFIRMATION environment variable to run.
 * Run with: CONFIRM_DELETE_TEST_USERS=yes npm run clear-test-users
 */

import { supabase } from '../db/supabase-client.js';

async function clearTestUsers() {
  console.log('🗑️  Clearing test users...\n');

  if (process.env.CONFIRM_DELETE_TEST_USERS !== 'yes') {
    console.error('❌ SAFETY CHECK FAILED');
    console.error('This script requires CONFIRM_DELETE_TEST_USERS=yes to run.');
    console.error('Run with: CONFIRM_DELETE_TEST_USERS=yes npm run clear-test-users');
    process.exit(1);
  }

  try {
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, username, email, role, created_at');

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('✅ No users found in database');
      return;
    }

    const superAdmins = users.filter(u => u.role === 'super_admin');
    if (superAdmins.length > 0) {
      console.error('❌ ABORT: Found super_admin users that would be deleted:');
      superAdmins.forEach(u => console.error(`   - ${u.username} (${u.email})`));
      console.error('Super admin users are protected. Remove their role first or delete manually.');
      process.exit(1);
    }

    console.log(`Found ${users.length} user(s):\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) [${user.role}]`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}\n`);
    });

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('❌ Error deleting users:', deleteError.message);
      return;
    }

    console.log('✅ All test users cleared successfully!');
    console.log('   Wallets were automatically deleted (CASCADE)');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

clearTestUsers().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
