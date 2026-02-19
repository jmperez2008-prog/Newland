import { createClient } from '@supabase/supabase-js';

// Declare process for TypeScript in case @types/node is missing
declare const process: { env: { [key: string]: string | undefined } };

// Use fallbacks to prevent "supabaseUrl is required" error during initialization
// if environment variables are not yet set (e.g. in a new Vercel deployment).
const envUrl = process.env.VITE_SUPABASE_URL;
const envKey = process.env.VITE_SUPABASE_KEY;

if (!envUrl || !envKey) {
  console.warn('Supabase URL or Key missing in environment variables. Please check your Vercel configuration.');
}

// createClient throws if URL is empty. We provide a placeholder to allow the app to load.
// Database calls will simply fail gracefully (handled by UI), rather than a white screen crash.
const supabaseUrl = envUrl || 'https://placeholder.supabase.co';
const supabaseKey = envKey || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);