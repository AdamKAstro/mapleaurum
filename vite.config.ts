// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';


export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  optimizeDeps: {
    include: ['lucide-react'],
  },
  build: { // Add this section
    sourcemap: true, // Enable source maps for production builds
  },
  // server: { // Optional: Explicitly ensure for dev server if needed
     // sourcemap: true, // Usually true by default for dev
  // }
});