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
      'framer-motion',
    ],
  },
  build: {
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
          lucide: ['lucide-react'],
          utilities: ['react-hot-toast', 'react-lazy-load-image-component', 'lodash'],
          motion: ['framer-motion'],
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
  },
  server: {
    mimeTypes: {
      'text/css': ['css'],
    },
    fs: {
      allow: ['.'],
    },
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' https://js.stripe.com 'unsafe-inline' 'unsafe-eval'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; img-src 'self' https://mapleaurum.com https://ui-avatars.com https://*.supabase.co data:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://api.stripe.com wss://*.supabase.co https://*.supabase.co ws://localhost:5173 wss://localhost:5173; frame-src 'self' https://js.stripe.com https://share.descript.com; media-src 'self' blob:; worker-src 'self' blob:; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests; report-to csp-report;",
      'Report-To': '{"group":"csp-report","max_age":10886400,"endpoints":[{"url":"https://your-report-endpoint.com"}]}',
    },
  },
});