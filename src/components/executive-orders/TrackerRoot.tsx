// File: src/components/executive-orders/TrackerRoot.tsx
// Description: Root component that combines all tracker components and manages state

import React, { useState, useCallback } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { TrackerLayout } from './layouts/TrackerLayout';
import { TrackerHeader } from './layouts/TrackerHeader';
import { TrackerSidebar } from './layouts/TrackerSidebar';
import { OrderList } from './features/OrderList';
import type { OrderFilters } from '@/types';

const initialFilters: OrderFilters = {
  type: 'all',
  category: '',
  agency: '',
  status: '',
  search: '',
  page: 1,
  limit: 10
};

export function TrackerRoot() {
  // State management
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  // Fetch orders using your existing hook
  const { data, loading, error, mutate } = useOrders(filters);

  // Callback handlers
  const handleSearch = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, search: query, page: 1 }));
  }, []);

  const handleFilterChange = useCallback((type: string, value: string) => {
    setFilters(prev => ({ ...prev, [type]: value, page: 1 }));
  }, []);

  const handleCreateNew = useCallback(() => {
    // Implement your create new logic
    console.log('Create new clicked');
  }, []);

  const handleExport = useCallback(() => {
    // Implement your export logic
    console.log('Export clicked');
  }, []);

  const handleCompare = useCallback(() => {
    setIsComparing(prev => !prev);
  }, []);

  const handleThemeToggle = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Error handling
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading orders: {error.message}</p>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <TrackerHeader
        onSearch={handleSearch}
        onCreateNew={handleCreateNew}
        onThemeToggle={handleThemeToggle}
      />
      
      <TrackerLayout orders={data?.orders || []} lastUpdate={data?.metadata?.lastUpdated}>
        <div className="flex gap-6">
          <TrackerSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            categories={data?.metadata?.categories || []}
            agencies={data?.metadata?.agencies || []}
            statuses={data?.metadata?.statuses || []}
            onExport={handleExport}
            onCompare={handleCompare}
          />
          
          <main className="flex-1">
            <OrderList
              orders={data?.orders || []}
              loading={loading}
              isComparing={isComparing}
              onOrderSelect={handleCompare}
              pagination={data?.pagination}
              onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
            />
          </main>
        </div>
      </TrackerLayout>
    </div>
  );
}