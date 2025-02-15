// File: src/components/executive-orders/layouts/TrackerLayout.tsx
// Description: Main layout component for the executive order tracker

import React from 'react';
import { StatsCards } from '../features/StatsCards';
import { useOrderStats } from '@/hooks/useOrderStats';
import type { Order } from '@/types';

interface TrackerLayoutProps {
  children: React.ReactNode;
  orders: Order[];
  lastUpdate?: string | null;
  className?: string;
}

export function TrackerLayout({ 
  children, 
  orders, 
  lastUpdate,
  className = '' 
}: TrackerLayoutProps) {
  const stats = useOrderStats({ orders, lastUpdate });

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        <StatsCards stats={stats.orderStats} className="mb-8" />
        <main>{children}</main>
      </div>
    </div>
  );
}