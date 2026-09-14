// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

// Singleton browser client with session persistence.
// Uses cookies so the server can read the same session (unlike localStorage).
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default supabase;