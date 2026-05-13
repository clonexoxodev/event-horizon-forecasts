#!/usr/bin/env tsx
/**
 * Script to clear test users from the database
 * Usage: npm run clear-test-users
 */

import { supabase } from '../db/supabase-client.js';

async function clearTestUsers() {
  console.log('🗑️  Clearing test users...\n');

  try {
    // Get all users
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, username, email, created_at');

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('✅ No users found in database');
      return;
    }

    console.log(`Found ${users.length} user(s):\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}\n`);
    });

    // Delete all users (wallets will be cascade deleted)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except system user if exists

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

// Run the script
clearTestUsers().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
