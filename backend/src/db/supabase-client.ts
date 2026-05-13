import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Test Supabase connection
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase
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
    let query = supabase.from(table);
    
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