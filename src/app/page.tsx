'use client';

import dynamic from 'next/dynamic';

const ExecutiveOrderTracker = dynamic(
  () => import('@/components/executive-orders/ExecutiveOrderTracker').then(mod => mod.default),
  { ssr: false }
);

export default function Home() {
  return <ExecutiveOrderTracker />;
}