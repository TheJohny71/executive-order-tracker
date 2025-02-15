// File: src/components/executive-orders/TrackerRoot.tsx
// Description: Root component that combines all tracker components and manages state

import React, { useState, useCallback } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useOrderComparison } from '@/hooks/useOrderComparison';
import { TrackerLayout } from './layouts/TrackerLayout';
import { TrackerHeader } from './layouts/TrackerHeader';
import { TrackerSidebar } from './layouts/TrackerSidebar';
import { OrderList } from './features/OrderList';
import { OrderComparison } from './features/OrderComparison';
import type { OrderFilters, Order } from '@/types';

const initialFilters: OrderFilters = {
  type: 'all',
  category: '',
  agency: '',
  statusId: null, // Changed from status to statusId
  search: '',
  page: 1,
  limit: 10,
  sort: 'desc'
};

export function TrackerRoot() {
  // State management
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Order comparison state
  const {
    selectedOrders,
    isComparing,
    canAddToComparison,
    addOrder,
    removeOrder,
    clearComparison,
    toggleComparison
  } = useOrderComparison();

  // Fetch orders using your existing hook
  const { data, loading, error } = useOrders(filters); // Removed mutate as it's not in the type

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

  const handleThemeToggle = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Error handling
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading orders: {error}</p>
      </div>
    );
  }

  const lastUpdated = data?.metadata?.lastUpdate || new Date(); // Added fallback

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <TrackerHeader
        onSearch={handleSearch}
        onCreateNew={handleCreateNew}
        onThemeToggle={handleThemeToggle}
      />
      
      <TrackerLayout orders={data?.orders || []} lastUpdate={lastUpdated}>
        {isComparing && selectedOrders.length > 0 ? (
          <OrderComparison
            orders={selectedOrders}
            onClose={clearComparison}
            onRemoveOrder={removeOrder}
          />
        ) : (
          <div className="flex gap-6">
            <TrackerSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              categories={data?.metadata?.categories || []}
              agencies={data?.metadata?.agencies || []}
              statuses={data?.metadata?.statuses || []}
              onExport={handleExport}
              onCompare={toggleComparison}
            />
            
            <main className="flex-1">
              <OrderList
                orders={data?.orders || []}
                loading={loading}
                isComparing={isComparing}
                onOrderSelect={addOrder}
                pagination={data?.pagination}
                onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
              />
            </main>
          </div>
        )}
      </TrackerLayout>
    </div>
  );
}