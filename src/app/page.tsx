'use client';

import dynamic from 'next/dynamic';

const ExecutiveOrderTracker = dynamic(
  () => import('@/components/executive-orders/ExecutiveOrderTracker'),
  { ssr: false }
);

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ExecutiveOrderTracker />
    </div>
  );
}