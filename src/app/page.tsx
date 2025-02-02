'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  BarChart2, 
  List, 
  Grid, 
  ArrowUp 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrders } from '@/hooks/useOrders';
import type { Order } from '@/types';
import { LoadingSkeleton } from '@/components/executive-orders/loading-skeleton';
import { TimelineChart } from '@/components/executive-orders/timeline-chart';
import { OrderCard } from '@/components/executive-orders/order-card';

const DEFAULT_FILTERS = {
  type: 'all',
  category: 'all',
  agency: 'all',
  search: '',
  dateFrom: '',
  dateTo: '',
  page: 1,
  limit: 10
};

export default function ExecutiveOrderTracker() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<'expanded' | 'compact'>('expanded');
  const [recentlyViewed, setRecentlyViewed] = useState<Order[]>([]);
  const [showTimeline, setShowTimeline] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [compareItems, setCompareItems] = useState<Order[]>([]);
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false);

  const { data, error, loading } = useOrders(filters);

  useEffect(() => {
    const stored = localStorage.getItem('recentlyViewed');
    if (stored) {
      try {
        setRecentlyViewed(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recently viewed orders:', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && e.target === document.body) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput instanceof HTMLInputElement) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  const addToRecentlyViewed = (order: Order) => {
    setRecentlyViewed(prev => {
      const newRecent = [order, ...prev.filter(o => o.id !== order.id)].slice(0, 5);
      localStorage.setItem('recentlyViewed', JSON.stringify(newRecent));
      return newRecent;
    });
  };

  const toggleCompare = (order: Order) => {
    setCompareItems(prev => {
      if (prev.find(o => o.id === order.id)) {
        return prev.filter(o => o.id !== order.id);
      }
      return [...prev, order].slice(0, 2);
    });
  };

  const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value, page: 1 }));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Error Loading Orders</h2>
          <p className="mt-2 text-gray-600">{error.message}</p>
          <Button 
            className="mt-4"
            onClick={() => setFilters(prev => ({ ...prev }))}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Component */}
      <header className="bg-white border-b sticky top-0 z-50">
        {/* ... Header content ... */}
      </header>

      {/* Timeline Component */}
      {showTimeline && data?.orders && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <TimelineChart orders={data.orders} />
          </div>
        </div>
      )}

      {/* Recently Viewed Component */}
      {recentlyViewed.length > 0 && (
        <div className="bg-gray-50 border-b">
          {/* ... Recently viewed content ... */}
        </div>
      )}

      {/* Filters Component */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              className="pl-10"
              placeholder="Search orders... (Press '/' to focus)"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          <Select 
            value={filters.type} 
            onValueChange={(value) => handleFilterChange('type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Executive Order">Executive Order</SelectItem>
              <SelectItem value="Memorandum">Memorandum</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.category} 
            onValueChange={(value) => handleFilterChange('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {data?.metadata.categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={filters.agency} 
            onValueChange={(value) => handleFilterChange('agency', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Agency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agencies</SelectItem>
              {data?.metadata.agencies.map(agency => (
                <SelectItem key={agency} value={agency}>
                  {agency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="w-full"
          />
        </div>

        {/* Filter Results Count */}
        <div className="mt-4 text-sm text-gray-500">
          {loading ? (
            'Loading...'
          ) : (
            <>
              Showing {Math.min(filters.limit, data?.orders.length ?? 0)} of {data?.pagination.total ?? 0} orders
              {filters.type !== 'all' && ` • Filtered by type: ${filters.type}`}
              {filters.category !== 'all' && ` • Category: ${filters.category}`}
              {filters.agency !== 'all' && ` • Agency: ${filters.agency}`}
              {filters.search && ` • Search: "${filters.search}"`}
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-4">
            {/* Comparison View */}
            {isComparing && compareItems.length > 0 && (
              <ComparisonView items={compareItems} />
            )}

            {/* Order Cards */}
            {data?.orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isComparing={isComparing}
                compareItems={compareItems}
                onCompareToggle={toggleCompare}
                onRecentlyViewed={addToRecentlyViewed}
                onFilterChange={handleFilterChange}
              />
            ))}

            {/* Pagination */}
            {!loading && data?.pagination && data.pagination.pages > 1 && (
              <Pagination
                currentPage={data.pagination.currentPage}
                totalPages={data.pagination.pages}
                onPageChange={(page) => handleFilterChange('page', page.toString())}
              />
            )}
          </div>
        )}
      </div>

      {/* Mobile Actions */}
      <div className="md:hidden fixed bottom-6 right-6 flex flex-col gap-2">
        <Button
          className="rounded-full h-12 w-12 shadow-lg"
          onClick={() => setMobileFiltersVisible(!mobileFiltersVisible)}
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