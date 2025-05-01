// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary'; // Import it

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary> {/* Wrap App */}
      <App />
    </ErrorBoundary>
  </StrictMode>
);