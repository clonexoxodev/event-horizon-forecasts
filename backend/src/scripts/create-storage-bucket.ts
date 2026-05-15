import { supabase } from '../db/supabase-client.js';

/**
 * Script to create the market-images storage bucket
 */
async function createStorageBucket() {
  try {
    console.log('Creating market-images storage bucket...');

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('market-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB in bytes
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ market-images bucket already exists');
      } else {
        console.error('Error creating bucket:', error);
      }
      return;
    }

    console.log('✅ market-images bucket created successfully');
    console.log('Bucket data:', data);

    // Note: RLS policies need to be set up manually in Supabase dashboard or SQL editor
    console.log('\n⚠️  Remember to set up RLS policies in Supabase dashboard:');
    console.log('1. Go to Storage > Policies');
    console.log('2. Add policies for public read and authenticated write access');
  } catch (error) {
    console.error('Error creating storage bucket:', error);
  }
}

createStorageBucket();
