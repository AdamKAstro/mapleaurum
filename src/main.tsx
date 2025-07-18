//src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css'; // Single import, confirmed to be in src/
import './features/hook-ui/styles/hook-ui.css'; // Add this
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-screen text-red-500 bg-navy-900">
          Something went terribly wrong! Please reload the page.
        </div>
      }
    >
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'linear-gradient(to right, #06b6d4, #8b5cf6)',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            },
            duration: 3000,
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);