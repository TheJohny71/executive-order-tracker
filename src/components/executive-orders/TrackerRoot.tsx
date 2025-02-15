// File: src/components/executive-orders/TrackerRoot.tsx
import React from 'react';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOrders } from '@/lib/api';
import type { DocumentType, OrderFilters } from '@/types';
import { OrderList } from './features/OrderList';
import { OrderComparison } from './features/OrderComparison';
import { useSearchParams } from 'next/navigation';
import { useOrderComparison } from '@/hooks/useOrderComparison';
import { FilterBar } from './features/FilterBar';
import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';

const initialFilters: OrderFilters = {
  type: 'all',
  category: '',
  agency: '',
  statusId: undefined,
  search: '',
  page: 1,
  limit: 10,
  sort: 'desc'
};

export function TrackerRoot() {
  const searchParams = useSearchParams();
  const { selectedOrders, toggleOrderSelection, clearSelectedOrders } = useOrderComparison();
  
  // Get filters from URL params with proper type handling
  const filters = {
    ...initialFilters,
    type: (searchParams?.get('type') as DocumentType) || initialFilters.type,
    category: searchParams?.get('category') || initialFilters.category,
    agency: searchParams?.get('agency') || initialFilters.agency,
    statusId: searchParams?.get('statusId') ? Number(searchParams.get('statusId')) : undefined,
    search: searchParams?.get('search') || initialFilters.search,
    page: Number(searchParams?.get('page')) || initialFilters.page,
    limit: Number(searchParams?.get('limit')) || initialFilters.limit,
    sort: searchParams?.get('sort') || initialFilters.sort,
  };

  // Fetch orders with current filters
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(filters),
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-lg text-red-600">Error loading orders</p>
        <Button onClick={handleRefresh} variant="outline">
          <RotateCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const lastUpdated = data?.metadata?.updatedAt ? new Date(data.metadata.updatedAt) : new Date();

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Executive Orders</h1>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RotateCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <FilterBar
          metadata={data?.metadata}
          currentFilters={filters}
          isLoading={isLoading}
        />

        {selectedOrders.length > 0 ? (
          <OrderComparison
            orders={selectedOrders}
            onClose={clearSelectedOrders}
          />
        ) : (
          <OrderList
            orders={data?.orders || []}
            isLoading={isLoading}
            selectedOrders={selectedOrders}
            onOrderSelect={toggleOrderSelection}
          />
        )}

        <div className="text-sm text-gray-500 text-right">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      </div>
    </div>
  );
}