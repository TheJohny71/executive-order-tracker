'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Filter, BarChart2, List, Grid, ArrowUp 
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { LoadingSkeleton } from '@/components/executive-orders/loading-skeleton';
import { TimelineChart } from '@/components/executive-orders/timeline-chart';
import { OrderCard } from '@/components/executive-orders/order-card';
import { ComparisonView } from '@/components/executive-orders/comparison-view';
import { Pagination } from '@/components/executive-orders/pagination';

import { useOrders } from '@/hooks/useOrders';
import type { Order, FilterType, OrderFilters } from '@/types';

const DEFAULT_FILTERS: OrderFilters = {
  type: 'all',
  category: 'all',
  agency: 'all',
  search: '',
  dateFrom: '',
  dateTo: '',
  page: 1,
  limit: 10
};

interface FilterPanelProps {
  filters: OrderFilters;
  onFilterChange: (type: FilterType, value: string) => void;
  metadata?: {
    categories: string[];
    agencies: string[];
  };
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onFilterChange, metadata }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
    <div className="relative lg:col-span-2">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input 
        className="pl-10"
        placeholder="Search orders... (Press '/' to focus)"
        value={filters.search}
        onChange={(e) => onFilterChange('search', e.target.value)}
      />
    </div>
    
    <Select value={filters.type} onValueChange={(v) => onFilterChange('type', v)}>
      <SelectTrigger>
        <SelectValue placeholder="Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Types</SelectItem>
        <SelectItem value="Executive Order">Executive Order</SelectItem>
        <SelectItem value="Memorandum">Memorandum</SelectItem>
      </SelectContent>
    </Select>

    <Select value={filters.category} onValueChange={(v) => onFilterChange('category', v)}>
      <SelectTrigger>
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Categories</SelectItem>
        {metadata?.categories.map(category => (
          <SelectItem key={category} value={category}>{category}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select value={filters.agency} onValueChange={(v) => onFilterChange('agency', v)}>
      <SelectTrigger>
        <SelectValue placeholder="Agency" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Agencies</SelectItem>
        {metadata?.agencies.map(agency => (
          <SelectItem key={agency} value={agency}>{agency}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Input
      type="date"
      value={filters.dateFrom}
      onChange={(e) => onFilterChange('dateFrom', e.target.value)}
      className="w-full"
    />
  </div>
);

export function ExecutiveOrderTracker() {
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
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

  const handleFilterChange = (filterType: FilterType, value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      [filterType]: value,
      page: filterType === 'page' ? Number(value) : 1
    }));
  };

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Error Loading Orders</h2>
          <p className="mt-2 text-gray-600">{error.message}</p>
          <Button onClick={() => setFilters(prev => ({ ...prev }))}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Executive Order Tracker</h1>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span>Last Updated: {new Date().toLocaleDateString()}</span>
                <span className="mx-2">•</span>
                <span>Track and analyze White House executive orders and memoranda</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setViewMode(viewMode === 'expanded' ? 'compact' : 'expanded')}
              >
                {viewMode === 'expanded' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowTimeline(!showTimeline)}
              >
                <BarChart2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                className="md:flex hidden items-center gap-2"
                onClick={() => setIsComparing(!isComparing)}
              >
                Compare {isComparing && `(${compareItems.length}/2)`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      {showTimeline && data?.orders && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <TimelineChart orders={data.orders} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <FilterPanel 
          filters={filters} 
          onFilterChange={handleFilterChange} 
          metadata={data?.metadata}
        />
        {/* Filter results count */}
        <div className="mt-4 text-sm text-gray-500">
          Showing {data?.orders.length || 0} of {data?.pagination.total || 0} orders
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
        {mobileFiltersVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setMobileFiltersVisible(false)}>
            <div className="absolute right-0 top-0 h-full w-80 bg-white p-4" onClick={e => e.stopPropagation()}>
              <FilterPanel 
                filters={filters} 
                onFilterChange={handleFilterChange}
                metadata={data?.metadata}
              />
            </div>
          </div>
        )}
        <Button
          className="rounded-full h-12 w-12 shadow-lg"
          onClick={() => setMobileFiltersVisible(!mobileFiltersVisible)}
        >
          <Filter className="h-6 w-4" />
        </Button>
        <Button
          className="rounded-full h-12 w-12 shadow-lg"
          onClick={scrollToTop}
        >
          <ArrowUp className="h-6 w-4" />
        </Button>
      </div>
    </div>
  );
}