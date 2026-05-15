#!/usr/bin/env node

/**
 * Fix password directly in Supabase
 * This script updates the password for fehintoluwaolu@gmail.com
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Supabase credentials from .env
const SUPABASE_URL = 'https://tuqvhmxefiepdcmqffvt.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cXZobXhlZmllcGRjbXFmZnZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2NTQ3MywiZXhwIjoyMDkzNjQxNDczfQ.JYRBMh7Dh3YypwyvMLHZ7X9oBN2xMjL5VsUYoGkdKAA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixPassword() {
  try {
    console.log('🔧 Fixing password for fehintoluwaolu@gmail.com...');
    console.log('');

    // Password: fehin0706
    const password = 'fehin0706';
    const passwordHash = '$2b$12$KocWvp13JsRKNmVHrt9vr.Po01xDnh1VtUwTwUNnznqZdzNq9f/5e';

    console.log('📝 Password will be set to:', password);
    console.log('');

    // Update password
    const { data, error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        role: 'super_admin'
      })
      .eq('email', 'fehintoluwaolu@gmail.com')
      .select();

    if (error) {
      console.error('❌ Error updating password:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.error('❌ User not found with email: fehintoluwaolu@gmail.com');
      console.log('');
      console.log('💡 The user might not exist. Try creating the account first:');
      console.log('   1. Go to: https://event-horizon-forecasts.vercel.app/signup');
      console.log('   2. Create account with email: fehintoluwaolu@gmail.com');
      console.log('   3. Then run this script again');
      process.exit(1);
    }

    console.log('✅ Password updated successfully!');
    console.log('');
    console.log('👤 User details:');
    console.log('   Email:', data[0].email);
    console.log('   Username:', data[0].username);
    console.log('   Role:', data[0].role);
    console.log('');
    console.log('🔐 Login credentials:');
    console.log('   Email: fehintoluwaolu@gmail.com');
    console.log('   Password: fehin0706');
    console.log('');
    console.log('🌐 Login at: https://event-horizon-forecasts.vercel.app/login');
    console.log('');
    console.log('✅ Done! You can now login.');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

fixPassword();
