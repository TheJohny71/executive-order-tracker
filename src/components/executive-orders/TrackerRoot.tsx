// File: src/components/executive-orders/TrackerRoot.tsx
import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { fetchOrders } from '@/lib/api';
import { TrackerLayout } from './layouts/TrackerLayout';
import { OrderList } from './features/OrderList';
import OrderComparison from './features/OrderComparison';
import { useOrderComparison } from '@/hooks/useOrderComparison';
import type { DocumentType, OrderFilters } from '@/types';
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
  sort: 'desc',
  dateFrom: '',
  dateTo: ''
};

export function TrackerRoot() {
  const searchParams = useSearchParams();
  const { selectedOrders, toggleOrderSelection, clearSelectedOrders } = useOrderComparison();
  
  // Get filters from URL params
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
    dateFrom: searchParams?.get('dateFrom') || initialFilters.dateFrom,
    dateTo: searchParams?.get('dateTo') || initialFilters.dateTo,
  };

  // Fetch orders with current filters
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(filters),
  });

  const handleFilterChange = useCallback((type: keyof OrderFilters, value: string) => {
    const newParams = new URLSearchParams(searchParams?.toString());
    if (value) {
      newParams.set(type, value);
    } else {
      newParams.delete(type);
    }
    if (type !== 'page') {
      newParams.delete('page'); // Reset pagination when filters change
    }
    window.history.pushState({}, '', `?${newParams.toString()}`);
    refetch();
  }, [searchParams, refetch]);

  const handleExport = useCallback(() => {
    // Implement export functionality
    console.log('Export clicked', {
      filters,
      selectedOrders: selectedOrders.map(o => o.id)
    });
  }, [filters, selectedOrders]);

  const handleSearch = useCallback((query: string) => {
    handleFilterChange('search', query);
  }, [handleFilterChange]);

  const handleCreateNew = useCallback(() => {
    // Implement create new functionality
    console.log('Create new clicked');
  }, []);

  const handleClearFilters = useCallback(() => {
    window.history.pushState({}, '', window.location.pathname);
    refetch();
  }, [refetch]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-lg text-red-600">Error loading orders</p>
        <Button onClick={refetch} variant="outline">
          <RotateCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const lastUpdated = data?.metadata?.updatedAt ? new Date(data.metadata.updatedAt) : new Date();

  return (
    <TrackerLayout
      orders={data?.orders || []}
      filters={filters}
      metadata={data?.metadata || { categories: [], agencies: [], statuses: [] }}
      lastUpdate={lastUpdated.toISOString()}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      onExport={handleExport}
      onCompare={clearSelectedOrders}
      onSearch={handleSearch}
      onCreateNew={handleCreateNew}
    >
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
      
      <div className="mt-4 text-sm text-gray-500 text-right">
        Last updated: {lastUpdated.toLocaleString()}
      </div>
    </TrackerLayout>
  );
}