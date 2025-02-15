// File: src/app/page.tsx
// Description: Main app page that renders the tracker

import { TrackerRoot } from '@/components/executive-orders/TrackerRoot';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TrackerRoot />
    </div>
  );
}