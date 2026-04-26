'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-light">
              <AlertTriangle className="h-8 w-8 text-error" />
            </div>
            <h2 className="text-lg font-semibold text-charcoal">Ca n&apos;a pas marche</h2>
            <p className="max-w-sm text-sm text-charcoal/60">
              Un probleme est survenu. Reessaie dans quelques instants.
            </p>
            <Button variant="outline" onClick={() => this.setState({ hasError: false })}>
              Reessayer
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
