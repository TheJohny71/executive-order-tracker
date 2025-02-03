'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
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

import { LoadingSkeleton } from './loading-skeleton';
import { TimelineChart } from './timeline-chart';
import { OrderCard } from './order-card';
import { Pagination } from './pagination';

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
  <div className="flex flex-wrap gap-4">
    <div className="relative flex-grow min-w-[300px]">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input 
        className="pl-10 w-full"
        placeholder="Search orders..."
        value={filters.search}
        onChange={(e) => onFilterChange('search', e.target.value)}
      />
    </div>
    
    <Select value={filters.type} onValueChange={(v) => onFilterChange('type', v)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Types</SelectItem>
        <SelectItem value="Executive Order">Executive Order</SelectItem>
        <SelectItem value="Memorandum">Memorandum</SelectItem>
      </SelectContent>
    </Select>

    <Select value={filters.category} onValueChange={(v) => onFilterChange('category', v)}>
      <SelectTrigger className="w-[180px]">
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
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Agency" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Agencies</SelectItem>
        {metadata?.agencies.map(agency => (
          <SelectItem key={agency} value={agency}>{agency}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export function ExecutiveOrderTracker() {
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [recentlyViewed, setRecentlyViewed] = useState<Order[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [compareItems, setCompareItems] = useState<Order[]>([]);
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

  const handleCompareToggle = (order: Order) => {
    setCompareItems(prev => {
      if (prev.find(o => o.id === order.id)) {
        return prev.filter(o => o.id !== order.id);
      }
      return [...prev, order].slice(0, 2);
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <Button onClick={() => setFilters(prev => ({ ...prev }))}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
                {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Executive Order Tracker</h1>
              <p className="mt-2 text-gray-600">
                Track and analyze White House executive orders and memoranda
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsComparing(!isComparing)}
              className="hidden md:flex items-center gap-2"
            >
              Compare {isComparing && `(${compareItems.length}/2)`}
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      {data?.orders && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <TimelineChart orders={data.orders} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <FilterPanel 
              filters={filters} 
              onFilterChange={handleFilterChange} 
              metadata={data?.metadata}
            />
          </CardContent>
        </Card>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-4">
            {/* Order Cards */}
            {data?.orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isComparing={false}
                compareItems={[]}
                onCompareToggle={() => {}}
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
    </div>
  );
}