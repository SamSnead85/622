'use client';

import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Global Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Report to error monitoring in production
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
            // Sentry integration: uncomment when @sentry/nextjs is installed
            // import('@sentry/nextjs').then(Sentry => {
            //     Sentry.captureException(error, {
            //         contexts: { react: { componentStack: errorInfo.componentStack } },
            //     });
            // }).catch(() => {});
        }
        console.error('Error caught by boundary:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">An unexpected error occurred</h3>
                        <p className="text-white/60 mb-6">
                            We encountered an unexpected error. Please try again or refresh the page.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                            >
                                Refresh Page
                            </button>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-sm text-white/40 cursor-pointer hover:text-white/60">
                                    Error Details (Development Only)
                                </summary>
                                <pre className="mt-2 p-4 rounded-lg bg-black/50 text-red-400 text-xs overflow-auto">
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Page-level Error Boundary with branded styling
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary
            fallback={
                <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-8">
                    <div className="text-center max-w-lg">
                        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                            <span className="text-5xl">🔧</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-4">Page Error</h1>
                        <p className="text-white/60 mb-8">
                            This page encountered an error. Please try refreshing the page.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <a
                                href="/dashboard"
                                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium"
                            >
                                Go to Dashboard
                            </a>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-8 py-4 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
}

export default ErrorBoundary;
