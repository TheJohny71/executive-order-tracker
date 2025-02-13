"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { LoadingFallback } from "@/components/loading/LoadingFallback";

const ExecutiveOrderTracker = dynamic(
  () => import("@/components/executive-orders/ExecutiveOrderTracker"),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  },
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
