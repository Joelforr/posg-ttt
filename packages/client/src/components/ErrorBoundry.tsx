import { Component } from 'react';
import type { ReactNode } from 'react';
import { ErrorScreen } from './ErrorScreen';

interface State { error: Error | null; }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error) { console.error('render error', error); }
  render() {
    if (this.state.error) {
      return (
        <ErrorScreen
          code="500"
          title="Something broke"
          subtitle='state.error'
          message="The app hit an unexpected error. Reload to try again."
          actionLabel="Reload"
          onAction={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}