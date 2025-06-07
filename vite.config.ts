import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // --- ADD THIS BLOCK TO FIX THE BUILD ERROR ---
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  // ---------------------------------------------
  optimizeDeps: {
    include: ['lucide-react'],
  },
  build: {
    minify: false,
    terserOptions: { compress: false, mangle: false },
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          lucide: ['lucide-react'],
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'index.css') {
            return 'assets/css/index[extname]'; // Force consistent CSS name
          }
          return 'assets/[name]-[hash][extname]';
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  esbuild: {
    minify: false,
  },
  css: {
    devSourcemap: true,
    preload: false, // Disable CSS preloading
  },
});