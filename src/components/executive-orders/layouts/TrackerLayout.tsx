// File: src/components/executive-orders/layouts/TrackerLayout.tsx
import React from 'react';
import { TrackerHeader } from './TrackerHeader';
import { TrackerSidebar } from './TrackerSidebar';
import { StatsCards } from '../features/StatsCards';
import type { Order, OrderFilters, OrderMetadata } from '@/types';

interface TrackerLayoutProps {
  children: React.ReactNode;
  orders: Order[];
  filters: OrderFilters;
  metadata: OrderMetadata;
  lastUpdate?: string | null;
  onFilterChange: (type: keyof OrderFilters, value: string) => void;
  onExport: () => void;
  onCompare: () => void;
  onSearch: (query: string) => void;
  onCreateNew: () => void;
  className?: string;
}

export function TrackerLayout({ 
  children, 
  orders,
  filters,
  metadata,
  lastUpdate,
  onFilterChange,
  onExport,
  onCompare,
  onSearch,
  onCreateNew,
  className = '' 
}: TrackerLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <TrackerHeader 
        onSearch={onSearch}
        onCreateNew={onCreateNew}
        onThemeToggle={() => {}} // We can implement theme toggle later
      />

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        {/* Stats Section */}
        <StatsCards stats={{
          totalOrders: orders.length,
          activeOrders: orders.filter(o => o.status.name.toLowerCase() === 'active').length,
          newOrdersThisMonth: orders.filter(o => {
            const orderDate = new Date(o.datePublished);
            const today = new Date();
            return orderDate.getMonth() === today.getMonth() && 
                   orderDate.getFullYear() === today.getFullYear();
          }).length,
          pendingReview: orders.filter(o => o.status.name.toLowerCase() === 'pending').length,
        }} className="mb-8" />

        {/* Content Grid */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <TrackerSidebar
            filters={filters}
            metadata={metadata}
            onFilterChange={onFilterChange}
            onExport={onExport}
            onCompare={onCompare}
          />

          {/* Main Content Area */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}