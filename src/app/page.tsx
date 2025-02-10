"use client";

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { LoadingFallback } from '@/components/loading/LoadingFallback';
import ExecutiveOrderTracker from '@/components/executive-orders/ExecutiveOrderTracker';

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ErrorBoundary>
        <ExecutiveOrderTracker />
      </ErrorBoundary>
    </Suspense>
  );
}
