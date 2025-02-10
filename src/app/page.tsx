"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { LoadingFallback } from '@/components/loading/LoadingFallback';
import type { FC } from 'react';

// Create a separate loader function to handle the import
const loadExecutiveOrderTracker = async () => {
  // Explicitly type the module
  const mod = await import('@/components/executive-orders/ExecutiveOrderTracker');
  // Return the component, preferring named export
  return mod.ExecutiveOrderTracker as FC;
};

const ExecutiveOrderTracker = dynamic(loadExecutiveOrderTracker, {
  loading: () => <LoadingFallback />,
  ssr: false
});

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ErrorBoundary>
        <ExecutiveOrderTracker />
      </ErrorBoundary>
    </Suspense>
  );
}