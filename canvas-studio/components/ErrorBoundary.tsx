import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Canvas Studio] Unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleDismiss = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-[#111] border border-red-500/30 rounded-2xl p-8 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-widest">System Error</h2>
                <p className="text-xs text-gray-500">Canvas Studio encountered an unexpected error</p>
              </div>
            </div>

            <div className="bg-black/50 border border-gray-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-400 font-mono break-all">
                {this.state.error?.message || 'Unknown error'}
              </p>
              {this.state.error?.stack && (
                <details className="mt-3">
                  <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-400 uppercase tracking-widest">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-[10px] text-gray-600 font-mono overflow-auto max-h-40 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white text-sm font-bold rounded-lg hover:from-cyan-500 hover:to-emerald-500 transition-all uppercase tracking-wider"
              >
                Reload App
              </button>
              <button
                onClick={this.handleDismiss}
                className="flex-1 py-3 bg-gray-800 text-gray-400 text-sm font-bold rounded-lg hover:bg-gray-700 hover:text-white transition-all uppercase tracking-wider"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
