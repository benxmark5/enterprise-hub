import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// For client-side use
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For server-side use
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};

// Default export for backward compatibility
export default supabase;