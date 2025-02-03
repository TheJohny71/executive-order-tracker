// src/app/page.tsx
import { ExecutiveOrderTracker } from '@/components/executive-orders/ExecutiveOrderTracker';

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ExecutiveOrderTracker />
    </div>
  );
}
