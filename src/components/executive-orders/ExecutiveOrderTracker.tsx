// src/components/executive-orders/ExecutiveOrderTracker.tsx
import React, { useState } from 'react';
import { Filter, ArrowUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { OrderHeader } from './ui/OrderHeader';
import { OrderFilters } from './ui/OrderFilters';
import { OrderCard } from './ui/OrderCard';
import { useOrders } from '@/hooks/useOrders';
import type { Order, OrderFilters as OrderFiltersType, FilterType } from '@/types';

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[1, 2, 3].map((n) => (
      <div key={n} className="h-32 bg-gray-200 rounded-lg" />
    ))}
  </div>
);

export default function ExecutiveOrderTracker() {
  // State
  const [filters, setFilters] = useState<OrderFiltersType>({
    type: '',
    category: '',
    agency: '',
    search: '',
    page: 1,
    limit: 10,
  });
  const [viewMode, setViewMode] = useState<'expanded' | 'compact'>('expanded');
  const [isComparing, setIsComparing] = useState(false);
  const [compareItems, setCompareItems] = useState<Order[]>([]);
  const [showTimeline, setShowTimeline] = useState(true);
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false);

  // Fetch data
  const { data, loading, error, refresh, lastUpdate } = useOrders(filters);

  // Handlers
  const handleFilterChange = (type: FilterType, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: value,
      page: 1 // Reset page when filters change
    }));
  };

  const handleCompareToggle = (order: Order) => {
    setCompareItems(prev => {
      const exists = prev.find(item => item.id === order.id);
      if (exists) {
        return prev.filter(item => item.id !== order.id);
      }
      if (prev.length >= 2) {
        return [...prev.slice(1), order];
      }
      return [...prev, order];
    });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Error: {error}</p>
        <Button onClick={refresh} className="ml-4">Retry</Button>
      </div>
    );
  }

  const formattedLastUpdate = lastUpdate ? new Date(lastUpdate).toISOString() : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <OrderHeader 
        viewMode={viewMode}
        showTimeline={showTimeline}
        isComparing={isComparing}
        onViewModeChange={setViewMode}
        onTimelineToggle={() => setShowTimeline(!showTimeline)}
        onCompareToggle={() => setIsComparing(!isComparing)}
        totalOrders={data?.pagination.total}
        lastUpdate={formattedLastUpdate}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <OrderFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          categories={data?.metadata.categories || []}
          agencies={data?.metadata.agencies || []}
        />

        <div className="mt-4 text-sm text-gray-500">
          Showing {data?.orders.length || 0} of {data?.pagination.total || 0} orders
        </div>

        <div className="space-y-4 mt-4">
          {loading && !data ? (
            <LoadingSkeleton />
          ) : (
            data?.orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                viewMode={viewMode}
                isComparing={isComparing}
                compareItems={compareItems}
                onCompareToggle={handleCompareToggle}
                onRecentlyViewed={() => {}}
                onFilterChange={handleFilterChange}
              />
            ))
          )}
        </div>

        {data?.pagination.hasMore && (
          <div className="mt-4 text-center">
            <Button 
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              variant="outline"
            >
              Load More
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Actions */}
      <div className="md:hidden fixed bottom-6 right-6 flex flex-col gap-2">
        <Button
          className="rounded-full h-12 w-12 shadow-lg"
          onClick={() => setMobileFiltersVisible(true)}
        >
          <Filter className="h-6 w-6" />
        </Button>
        <Button
          className="rounded-full h-12 w-12 shadow-lg"
          onClick={scrollToTop}
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}