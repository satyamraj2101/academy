import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // A stale tab left open across a deploy references chunk hashes that no
    // longer exist, so a lazy-loaded route fails with this exact browser
    // error. A single automatic reload fetches the current index.html (and
    // therefore the current chunk manifest) and almost always self-heals —
    // guarded by a sessionStorage flag so a genuinely broken chunk doesn't
    // reload-loop forever.
    if (/Failed to fetch dynamically imported module/i.test(error.message)) {
      const key = 'spotclm_chunk_reload_attempted';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 bg-surface-950">
          <div className="max-w-md w-full premium-glass-card rounded-card p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-noise opacity-5 pointer-events-none" />
            
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <div className="absolute inset-0 animate-ring-pulse rounded-full border border-red-500/30" />
              <AlertTriangle className="w-8 h-8 text-red-400 relative z-10" />
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              We encountered an unexpected error while loading this page. 
              {this.state.error?.message && (
                <span className="block mt-2 font-mono text-xs text-slate-500 bg-slate-900/50 p-2 rounded">
                  {this.state.error.message}
                </span>
              )}
            </p>
            
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full relative group h-12 bg-indigo-600 rounded-control font-medium text-white shadow-raised hover:bg-indigo-500 hover:shadow-floating hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
