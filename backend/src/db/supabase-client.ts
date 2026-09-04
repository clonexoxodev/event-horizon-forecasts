import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseKey) {
    console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set. Falling back to anon key — RLS policies will be bypassed but security is degraded.');
  }
  const fallbackKey = supabaseKey || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY are required');
  }

  // Create Supabase client with service role key (bypasses RLS)
  supabaseInstance = createClient(supabaseUrl, fallbackKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseInstance;
}

// Export a getter instead of direct instance
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    return (client as any)[prop];
  }
});

// Test Supabase connection
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    console.log('Testing Supabase connection...');
    const client = getSupabaseClient();
    const { error } = await client
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    
    console.log('Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
}

// Query helper for Supabase
export async function supabaseQuery<T = any>(
  table: string,
  operation: 'select' | 'insert' | 'update' | 'delete',
  data?: any,
  filters?: any
): Promise<{ rows: T[]; rowCount: number }> {
  try {
    const client = getSupabaseClient();
    let query: any = client.from(table);
    
    switch (operation) {
      case 'select':
        query = query.select(data || '*');
        if (filters) {
          Object.keys(filters).forEach(key => {
            query = query.eq(key, filters[key]);
          });
        }
        break;
      case 'insert':
        query = query.insert(data).select();
        break;
      case 'update':
        query = query.update(data);
        if (filters) {
          Object.keys(filters).forEach(key => {
            query = query.eq(key, filters[key]);
          });
        }
        query = query.select();
        break;
      case 'delete':
        if (filters) {
          Object.keys(filters).forEach(key => {
            query = query.eq(key, filters[key]);
          });
        }
        query = query.delete();
        break;
    }
    
    const { data: result, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return {
      rows: result || [],
      rowCount: result?.length || 0
    };
  } catch (error) {
    console.error('Supabase query error:', error);
    throw error;
  }
}

export default supabase;