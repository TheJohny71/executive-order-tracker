import React, { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { fetchOrders } from '@/lib/api';
import { TrackerLayout } from './layouts/TrackerLayout';
import { OrderList } from './features/OrderList';
import OrderComparison from './features/OrderComparison';
import { useOrderComparison } from '@/hooks/useOrderComparison';
import type { DocumentType, Order, OrderFilters, OrderStats } from '@/types';
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
  const [viewMode, setViewMode] = useState<'standard' | 'focus'>('standard');
  
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

  const handleViewModeChange = useCallback((mode: 'standard' | 'focus') => {
    setViewMode(mode);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-lg text-red-600">Error loading orders</p>
        <Button onClick={() => refetch()} variant="outline">
          <RotateCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const lastUpdated = data?.metadata?.updatedAt ? new Date(data.metadata.updatedAt) : new Date();

  // Calculate stats
  const stats: OrderStats = {
    activeOrders: data?.orders.filter(o => o.status.name.toLowerCase() === 'active').length || 0,
    pendingReview: data?.orders.filter(o => o.status.name.toLowerCase() === 'pending').length || 0,
    newOrdersThisMonth: data?.orders.filter(o => {
      const orderDate = new Date(o.datePublished);
      const today = new Date();
      return orderDate.getMonth() === today.getMonth() && 
             orderDate.getFullYear() === today.getFullYear();
    }).length || 0,
    totalOrders: data?.orders.length || 0
  };

  return (
    <TrackerLayout
      orders={data?.orders || []}
      filters={filters}
      metadata={data?.metadata || { categories: [], agencies: [], statuses: [] }}
      lastUpdate={lastUpdated.toISOString()}
      onFilterChange={handleFilterChange}
      onExport={handleExport}
      onCompare={clearSelectedOrders}
      onSearch={handleSearch}
      onCreateNew={handleCreateNew}
      onClearFilters={handleClearFilters}
      stats={stats}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
    >
      {selectedOrders.length > 0 ? (
        <OrderComparison
          orders={selectedOrders}
          onClose={clearSelectedOrders}
        />
      ) : (
        <div className="space-y-6">
          <OrderList
            orders={data?.orders || []}
            isLoading={isLoading}
            selectedOrders={selectedOrders}
            onOrderSelect={toggleOrderSelection}
            viewMode={viewMode}
          />
          
          <div className="flex items-center justify-between text-sm text-gray-500 px-4">
            <span>
              Showing {data?.orders.length || 0} of {data?.metadata?.total || 0} orders
            </span>
            <span>
              Last updated: {lastUpdated.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </TrackerLayout>
  );
}