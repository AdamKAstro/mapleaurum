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
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'react-hot-toast',
      'react-lazy-load-image-component',
      'lodash',
	  'react-helmet-async',
    ],
  },
  build: {
    minify: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
          lucide: ['lucide-react'],
          utilities: ['react-hot-toast', 'react-lazy-load-image-component', 'lodash'],
        },
        assetFileNames: 'assets/[name]-[hash][extname]', // Ensures CSS goes to dist/assets/
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      // Add support for SCSS if used in the future
      scss: {
        additionalData: `@import "@/styles/variables.scss";`, // Optional
      },
    },
  },
  server: {
    // Ensure correct MIME types for CSS
    mimeTypes: {
      'text/css': ['css'],
    },
    fs: {
      // Allow serving files from src/
      allow: ['.'],
    },
    // Add Content Security Policy for development
    headers: {
      'Content-Security-Policy':
        "default-src 'self'; img-src 'self' https://mapleaurum.com https://ui-avatars.com https://dvagrllvivewyxolrhsh.supabase.co data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; connect-src 'self' https://dvagrllvivewyxolrhsh.supabase.co https://api.stripe.com; font-src 'self' data: https://fonts.gstatic.com; blob:; worker-src 'self' blob:;",
    },
  },
});