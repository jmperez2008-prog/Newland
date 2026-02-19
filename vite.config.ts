import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Declare process for TypeScript to avoid "Property 'cwd' does not exist on type 'Process'" error
declare const process: {
  cwd: () => string;
  env: { [key: string]: string | undefined };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // JSON.stringify with fallback ensures we inject explicit empty strings if undefined,
      // preventing "undefined" token syntax errors or logic issues in the client code.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_KEY': JSON.stringify(env.VITE_SUPABASE_KEY || ''),
    },
    build: {
      outDir: 'dist',
    }
  };
});