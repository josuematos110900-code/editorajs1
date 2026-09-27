/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('zod')) return 'vendor-forms';
            if (id.includes('react-router') || id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react';
            return 'vendor';
          }
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
  },
});
