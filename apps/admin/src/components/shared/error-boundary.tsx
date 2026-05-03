'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Production should ship this to an observability backend.
    console.error('AdminErrorBoundary', error, info);
  }

  reset = (): void => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-error/30 bg-error-light/30 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-error" />
          <p className="text-sm font-medium text-charcoal">Une erreur est survenue dans cette section.</p>
          <p className="max-w-md text-xs text-charcoal/60">{this.state.error?.message ?? 'Inconnue'}</p>
          <Button variant="outline" size="sm" onClick={this.reset}>
            <RefreshCw className="h-3.5 w-3.5" />
            Réessayer
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
