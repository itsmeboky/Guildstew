import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleReload = this.handleReload.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }
    // TODO: forward to Sentry (or equivalent) once telemetry is wired up.
  }

  componentDidUpdate(prevProps) {
    if (!this.state.hasError) return;
    const prev = prevProps.resetKeys;
    const next = this.props.resetKeys;
    if (!prev || !next) return;
    if (prev.length !== next.length) {
      this.reset();
      return;
    }
    for (let i = 0; i < prev.length; i++) {
      if (!Object.is(prev[i], next[i])) {
        this.reset();
        return;
      }
    }
  }

  reset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  handleReload() {
    window.location.reload();
  }

  handleGoHome() {
    window.location.href = '/';
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;

    const { error, errorInfo } = this.state;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100 p-6">
        <div className="max-w-md mx-auto text-center space-y-4">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-gray-400">
            An unexpected error occurred. Try refreshing the page or going back to the previous screen.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-4 py-2 rounded-md transition-colors"
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-4 py-2 rounded-md transition-colors"
            >
              Go home
            </button>
          </div>
          {import.meta.env.DEV && (
            <details className="text-left mt-4">
              <summary className="text-xs text-gray-500 cursor-pointer">Error details (dev only)</summary>
              <pre className="text-xs text-red-400 whitespace-pre-wrap mt-2">
                {error?.message ?? String(error)}
              </pre>
              {errorInfo?.componentStack && (
                <pre className="text-xs text-gray-500 whitespace-pre-wrap mt-2">
                  {errorInfo.componentStack}
                </pre>
              )}
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
