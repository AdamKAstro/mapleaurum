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
  eventId?: string; // For potential error tracking integration
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
    errorInfo: undefined,
    eventId: undefined,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const eventId = Math.random().toString(36).substring(2, 15); // Simple unique ID for this error instance
    // Log to console
    console.error('[ErrorBoundary] Uncaught error:', {
      eventId,
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Example: If you were using an error tracking service like Sentry
    // Sentry.withScope((scope) => {
    //   scope.setExtras(errorInfo);
    //   const eventId = Sentry.captureException(error);
    //   this.setState({ eventId });
    // });

    this.setState({ errorInfo, eventId });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div role="alert" className="p-6 max-w-lg mx-auto my-10 border border-red-500 rounded-lg bg-red-50 shadow-lg">
          <Typography variant="h2" className="text-red-700 text-2xl font-bold mb-3">
            Oops! Something went wrong.
          </Typography>
          <Typography variant="body" className="text-red-600 mb-4">
            We're sorry for the inconvenience. An unexpected error occurred.
            Please try reloading the page. If the problem continues, please contact support.
          </Typography>

          {/* Show more details in development for easier debugging */}
          {(import.meta.env.MODE === 'development' || window.location.hostname === 'localhost') && this.state.error && (
            <details className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded border border-red-300">
              <summary className="font-semibold cursor-pointer hover:text-red-700">Error Details (Development)</summary>
              <div className="mt-2 whitespace-pre-wrap break-all">
                <p><strong>Name:</strong> {this.state.error.name}</p>
                <p><strong>Message:</strong> {this.state.error.message}</p>
                {this.state.eventId && <p><strong>Error ID:</strong> {this.state.eventId}</p>}
                {this.state.error.stack && (
                    <>
                        <p className="mt-2 font-medium">Stack Trace:</p>
                        <pre className="text-xs bg-white p-2 rounded border border-red-200 overflow-auto max-h-48">{this.state.error.stack}</pre>
                    </>
                )}
                {this.state.errorInfo && this.state.errorInfo.componentStack && (
                    <>
                        <p className="mt-2 font-medium">Component Stack:</p>
                        <pre className="text-xs bg-white p-2 rounded border border-red-200 overflow-auto max-h-48">{this.state.errorInfo.componentStack}</pre>
                    </>
                )}
              </div>
            </details>
          )}

          <div className="flex items-center space-x-3 mt-6">
            <Button
              onClick={() => window.location.reload()}
              variant="primary" // Assuming you have a 'primary' variant
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-semibold"
            >
              Reload Page
            </Button>
             {/* Add a contact support button or link if applicable */}
            {/* <Button
              onClick={() => window.location.href = '/support'} // Or open a mailto link
              variant="outline"
              className="text-red-600 border-red-500 hover:bg-red-100 px-4 py-2 rounded-md font-semibold"
            >
              Contact Support
            </Button> */}
          </div>

          {this.state.eventId && !(import.meta.env.MODE === 'development' || window.location.hostname === 'localhost') && (
            <Typography variant="caption" className="mt-4 text-red-500 text-xs block">
              If contacting support, please provide this error ID: {this.state.eventId}
            </Typography>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;