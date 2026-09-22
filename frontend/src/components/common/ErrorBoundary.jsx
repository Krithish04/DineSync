import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Global React Error Boundary component that catches JavaScript errors in child component trees,
 * logs error stacks for monitoring, and presents a responsive fallback UI.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log error to browser console and operational monitoring pipeline
    // eslint-disable-next-line no-console
    console.error('[Frontend Monitoring] Uncaught React Component Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>

            <p className="text-xs text-muted-foreground">
              An unexpected error occurred in the application view. The system logged the incident for operational monitoring.
            </p>

            {this.state.error && (
              <div className="text-left bg-muted/50 p-3 rounded-xl border border-border font-mono text-[11px] text-rose-600 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={14} /> Reload Page
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
