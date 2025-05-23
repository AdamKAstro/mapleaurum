// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { Typography } from './ui/typography';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void; // Custom error handler
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  eventId?: string;
  errorCount: number; // Track how many times error occurred
}

class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  public state: State = {
    hasError: false,
    error: undefined,
    errorInfo: undefined,
    eventId: undefined,
    errorCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const eventId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Increment error count
    this.setState(prevState => ({
      errorInfo,
      eventId,
      errorCount: prevState.errorCount + 1,
    }));

    // Log to console with structured data
    console.error('[ErrorBoundary] Uncaught error:', {
      eventId,
      timestamp: new Date().toISOString(),
      errorCount: this.state.errorCount + 1,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Auto-reset after 5 errors to prevent infinite loops
    if (this.state.errorCount >= 4) {
      this.resetTimeoutId = setTimeout(() => {
        this.setState({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          errorCount: 0,
        });
      }, 5000);
    }
  }

  public componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorCount: 0,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDevelopment = import.meta.env.MODE === 'development' || window.location.hostname === 'localhost';
      const { error, errorInfo, eventId, errorCount } = this.state;

      return (
        <div role="alert" className="min-h-screen bg-navy-600 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-navy-700/90 backdrop-blur-sm rounded-lg border border-navy-500/50 shadow-2xl p-6 md:p-8">
            {/* Error Icon and Title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/20 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <Typography variant="h2" className="text-2xl font-bold text-surface-white">
                  Oops! Something went wrong
                </Typography>
                {errorCount > 1 && (
                  <Typography variant="caption" className="text-red-400 text-sm">
                    Error occurred {errorCount} times
                  </Typography>
                )}
              </div>
            </div>

            <Typography variant="body" className="text-surface-white/80 mb-6">
              We apologize for the inconvenience. An unexpected error has occurred. 
              You can try reloading the page or returning to the homepage.
            </Typography>

            {/* Error Details (Development Only) */}
            {isDevelopment && error && (
              <details className="mb-6 bg-navy-800/50 rounded-lg border border-navy-600/50 overflow-hidden">
                <summary className="px-4 py-3 font-semibold cursor-pointer hover:bg-navy-700/50 text-surface-white/90 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Error Details (Development Only)
                </summary>
                <div className="p-4 space-y-3 text-sm">
                  <div className="grid gap-2">
                    <div>
                      <span className="text-surface-white/60">Error ID:</span>
                      <code className="ml-2 text-accent-teal">{eventId}</code>
                    </div>
                    <div>
                      <span className="text-surface-white/60">Name:</span>
                      <code className="ml-2 text-red-400">{error.name}</code>
                    </div>
                    <div>
                      <span className="text-surface-white/60">Message:</span>
                      <code className="ml-2 text-surface-white/80">{error.message}</code>
                    </div>
                  </div>
                  
                  {error.stack && (
                    <div>
                      <p className="text-surface-white/60 mb-2">Stack Trace:</p>
                      <pre className="text-xs bg-navy-900/50 p-3 rounded border border-navy-600/30 overflow-auto max-h-48 text-surface-white/70">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {errorInfo?.componentStack && (
                    <div>
                      <p className="text-surface-white/60 mb-2">Component Stack:</p>
                      <pre className="text-xs bg-navy-900/50 p-3 rounded border border-navy-600/30 overflow-auto max-h-48 text-surface-white/70">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => window.location.reload()}
                variant="default"
                className={cn(
                  "bg-accent-teal hover:bg-accent-teal/80",
                  "text-navy-900 font-semibold",
                  "flex items-center gap-2"
                )}
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
              
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className={cn(
                  "border-navy-400 hover:bg-navy-600/50",
                  "text-surface-white hover:text-white",
                  "flex items-center gap-2"
                )}
              >
                <Home className="h-4 w-4" />
                Go to Homepage
              </Button>

              {/* Optional: Contact Support Button */}
              {!isDevelopment && (
                <Button
                  onClick={() => window.location.href = 'mailto:support@mapleaurum.com?subject=Error Report&body=Error ID: ' + eventId}
                  variant="outline"
                  className={cn(
                    "border-navy-400 hover:bg-navy-600/50",
                    "text-surface-white hover:text-white",
                    "flex items-center gap-2"
                  )}
                >
                  <Mail className="h-4 w-4" />
                  Contact Support
                </Button>
              )}
            </div>

            {/* Error ID for Support */}
            {!isDevelopment && eventId && (
              <div className="mt-6 p-3 bg-navy-800/50 rounded border border-navy-600/30">
                <Typography variant="caption" className="text-surface-white/60 text-xs">
                  If contacting support, please provide this error ID:
                  <code className="ml-2 text-accent-teal font-mono">{eventId}</code>
                </Typography>
              </div>
            )}

            {/* Auto-recovery notice */}
            {errorCount >= 4 && (
              <div className="mt-4 p-3 bg-amber-500/20 rounded border border-amber-500/30">
                <Typography variant="caption" className="text-amber-300 text-xs">
                  Multiple errors detected. The app will attempt to auto-recover in a few seconds...
                </Typography>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
