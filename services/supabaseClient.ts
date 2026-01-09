import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Access variables via process.env which are polyfilled by Vite
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient;

// Only initialize the real client if keys are present
if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase URL or Anon Key missing in environment variables. Database features will be disabled.');
  
  // Mock client to prevent app crash when env vars are missing
  // This allows the UI to render even if the backend connection isn't configured
  supabaseInstance = {
    from: (table: string) => ({
      select: (columns: string) => ({
        single: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      }),
    }),
    rpc: async (fn: string, args?: any) => ({ error: { message: 'Supabase not configured' } }),
  } as unknown as SupabaseClient;
}

export const supabase = supabaseInstance;