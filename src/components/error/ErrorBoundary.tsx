"use client";

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ErrorFallback } from './ErrorFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error caught by boundary:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}