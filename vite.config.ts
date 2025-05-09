import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import preload from 'vite-plugin-preload';

export default defineConfig({
  plugins: [
    react(),
    preload(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
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
      },
    },
  },
  esbuild: {
    minify: false,
  },
  css: {
    devSourcemap: true,
    preload: true,
  },
});