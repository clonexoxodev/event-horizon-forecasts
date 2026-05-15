import { supabase } from '../db/supabase-client.js';

/**
 * Script to verify that the market-images storage bucket exists
 * and create it if it doesn't
 */
async function verifyStorageBucket() {
  try {
    console.log('Checking for market-images storage bucket...');

    // List all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    console.log('Available buckets:', buckets?.map(b => b.name).join(', '));

    // Check if market-images bucket exists
    const marketImagesBucket = buckets?.find(b => b.name === 'market-images');

    if (marketImagesBucket) {
      console.log('✅ market-images bucket exists');
      console.log('Bucket details:', marketImagesBucket);
    } else {
      console.log('❌ market-images bucket does not exist');
      console.log('\nTo create the bucket, run the following in Supabase SQL Editor:');
      console.log(`
-- Create market-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('market-images', 'market-images', true);

-- Set up RLS policies for market-images bucket
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'market-images');

CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'market-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'market-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'market-images' AND auth.role() = 'authenticated');
      `);
    }
  } catch (error) {
    console.error('Error verifying storage bucket:', error);
  }
}

verifyStorageBucket();
