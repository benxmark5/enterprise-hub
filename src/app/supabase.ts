// Re-export the single shared Supabase client from the lib to avoid
// creating multiple GoTrueClient instances in the same browser context.
import { supabase } from '@/lib/supabase/client';

export { supabase };
export default supabase;