/**
 * ErrorBoundary — React error boundary with GenCraft Pro styled fallback UI
 * Catches rendering errors in child components and provides recovery options
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Copy, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Name of the section for error reporting */
  section?: string;
  /** Custom fallback UI */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Compact mode for smaller panels */
  compact?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log to console for debugging
    console.error(
      `[ErrorBoundary${this.props.section ? ` — ${this.props.section}` : ''}]`,
      error,
      errorInfo
    );
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleCopyError = (): void => {
    const { error, errorInfo } = this.state;
    const text = [
      `Error: ${error?.message}`,
      `Stack: ${error?.stack}`,
      `Component Stack: ${errorInfo?.componentStack}`,
    ].join('\n\n');

    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error } = this.state;
      const { fallback, section, compact } = this.props;

      // Custom fallback
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error!, this.handleReset);
        }
        return fallback;
      }

      // Compact error display for smaller panels
      if (compact) {
        return (
          <div className="flex flex-col items-center justify-center p-4 bg-red-500/[0.03] border border-red-500/10 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-400/60 mb-2" />
            <p className="text-[11px] text-zinc-400 text-center mb-2">
              {section ? `${section} encountered an error` : 'Something went wrong'}
            </p>
            <button
              onClick={this.handleReset}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900/50 border border-zinc-800 text-zinc-400 rounded-lg text-[10px] font-medium hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
            >
              <RefreshCcw className="w-3 h-3" />
              Retry
            </button>
          </div>
        );
      }

      // Full error display
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-zinc-950 rounded-xl border border-red-500/10">
          {/* Icon & title */}
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-sm font-bold text-zinc-200 mb-1">
            {section ? `${section} Error` : 'Something Went Wrong'}
          </h3>
          <p className="text-[11px] text-zinc-500 text-center max-w-xs mb-4">
            {error?.message || 'An unexpected error occurred while rendering this section.'}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg text-[11px] font-semibold hover:bg-violet-500/30 transition-all"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Try Again
            </button>
            <button
              onClick={this.handleCopyError}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-400 rounded-lg text-[11px] font-medium hover:text-zinc-200 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              {this.state.copied ? 'Copied!' : 'Copy Error'}
            </button>
          </div>

          {/* Expandable details */}
          <button
            onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {this.state.showDetails ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {this.state.showDetails ? 'Hide' : 'Show'} Details
          </button>

          {this.state.showDetails && (
            <div className="mt-3 w-full max-w-md">
              <pre className="bg-[#050505] border border-zinc-800/50 rounded-lg p-3 text-[10px] font-mono text-red-400/70 overflow-auto max-h-48 whitespace-pre-wrap">
                {error?.stack || 'No stack trace available'}
              </pre>
              {this.state.errorInfo?.componentStack && (
                <pre className="mt-2 bg-[#050505] border border-zinc-800/50 rounded-lg p-3 text-[10px] font-mono text-zinc-600 overflow-auto max-h-32 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
