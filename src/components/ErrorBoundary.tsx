// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button'; // Adjust path to your Button component
import { Typography } from './ui/typography'; // Adjust path to your Typography component

interface Props {
  children: ReactNode;
  fallback?: ReactNode; // Optional custom fallback UI
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
    errorInfo: undefined,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console
    console.error('[ErrorBoundary] Uncaught error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 max-w-lg mx-auto mt-10 border border-red-500 rounded-lg bg-red-50">
          <Typography variant="h2" className="text-red-700 text-2xl font-bold mb-4">
            Something went wrong
          </Typography>
          <Typography variant="body" className="text-red-600 mb-4">
            An unexpected error occurred. Please try reloading the page or contact support if the issue persists.
          </Typography>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4 text-sm text-red-600 whitespace-pre-wrap">
              <summary>Error Details</summary>
              <p>{this.state.error.toString()}</p>
              {this.state.error.stack && <p>{this.state.error.stack}</p>}
              {this.state.errorInfo && <p>Component Stack: {this.state.errorInfo.componentStack}</p>}
            </details>
          )}
          <Button
            onClick={() => window.location.reload()}
            variant="primary"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Reload Page
          </Button>
          <Typography variant="caption" className="mt-4 text-red-600 text-xs">
            Error ID: {this.state.error?.message || 'unknown'}
          </Typography>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;