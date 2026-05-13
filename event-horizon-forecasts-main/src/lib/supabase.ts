import { createClient } from "@supabase/supabase-js";

// Fallback Supabase configuration (not used in current implementation)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Create client with fallback values (this won't be used since we're using our backend API)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
