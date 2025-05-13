//src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css'; // Ensure this import exists
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-screen text-red-500 bg-navy-900">
          Something went terribly wrong! Please reload the page.
        </div>
      }
    >
      <App />
    </ErrorBoundary>
  </StrictMode>
);