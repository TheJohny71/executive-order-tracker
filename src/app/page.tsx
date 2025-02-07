'use client';

import dynamic from 'next/dynamic';
import { Suspense, Component } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode, ErrorInfo } from 'react';

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 p-4">
    <div className="max-w-7xl mx-auto">
      <Card className="mb-4">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
      </Card>
      
      {[1, 2, 3].map((i) => (
        <Card key={i} className="mb-4">
          <CardHeader>
            <Skeleton className="h-6 w-full max-w-md" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

interface ErrorFallbackProps {
  error: Error;
}

// Error component
const ErrorFallback = ({ error }: ErrorFallbackProps) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Error Loading Application</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">
          {error.message || 'Something went wrong. Please try again later.'}
        </p>
      </CardContent>
    </Card>
  </div>
);

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary Component
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
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

// Dynamically import the ExecutiveOrderTracker component
const ExecutiveOrderTracker = dynamic(
  () => import('@/components/executive-orders/ExecutiveOrderTracker').then(mod => mod.default),
  { 
    loading: () => <LoadingFallback />,
    ssr: false 
  }
);

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ErrorBoundary>
        <ExecutiveOrderTracker />
      </ErrorBoundary>
    </Suspense>
  );
}