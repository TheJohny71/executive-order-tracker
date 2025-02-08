'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  BarChart2, 
  List, 
  Grid, 
  ArrowUp, 
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderCard } from './order-card';
import { TimelineChart } from './timeline-chart';
import { useOrders } from '@/hooks/useOrders';
import { Pagination } from "./pagination";
import { DocumentType } from '@prisma/client';
import type { Order, FilterType, OrderFilters, OrderMetadata } from '@/types';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

interface FilterBarProps {
  filters: OrderFilters;
  metadata: OrderMetadata;
  onFilterChange: (type: FilterType, value: string) => void;
}

interface MobileFiltersProps extends FilterBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }, (_, i) => (
      <Card key={i}>
        <CardHeader className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-4 w-full">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Filter Bar Component
const FilterBar = ({ filters, metadata, onFilterChange }: FilterBarProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
    <div className="relative lg:col-span-2">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input 
        type="search"
        className="pl-10"
        placeholder="Search orders... (Press '/' to focus)"
        value={filters.search}
        onChange={(e) => onFilterChange('search', e.target.value)}
      />
    </div>
    
    <Select value={filters.type || "all"} onValueChange={(v) => onFilterChange('type', v === "all" ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Types</SelectItem>
        {Object.values(DocumentType).map(type => (
          <SelectItem key={type} value={type}>
            {type.replace('_', ' ')}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select value={filters.category || "all"} onValueChange={(v) => onFilterChange('category', v === "all" ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Categories</SelectItem>
        {metadata.categories.map(category => (
          <SelectItem key={category} value={category}>{category}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select value={filters.agency || "all"} onValueChange={(v) => onFilterChange('agency', v === "all" ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Agency" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Agencies</SelectItem>
        {metadata.agencies.map(agency => (
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

// Mobile Filters Component
const MobileFilters = ({ filters, metadata, onFilterChange, open, onOpenChange }: MobileFiltersProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>Filters</SheetTitle>
      </SheetHeader>
      <div className="mt-4">
        <FilterBar 
          filters={filters}
          metadata={metadata}
          onFilterChange={onFilterChange}
        />
      </div>
    </SheetContent>
  </Sheet>
);

const ExecutiveOrderTracker = () => {
  const [filters, setFilters] = useState<OrderFilters>({
    type: '',
    category: '',
    agency: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 10,
    statusId: undefined,
    sort: undefined
  });

  const [viewMode, setViewMode] = useState<'expanded' | 'compact'>('expanded');
  const [showTimeline, setShowTimeline] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [compareItems, setCompareItems] = useState<Order[]>([]);
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Order[]>([]);

  const { data, error, loading, refresh, lastUpdate } = useOrders(filters);

  const orders = data?.orders || [];
  const metadata = {
    categories: data?.metadata?.categories || [],
    agencies: data?.metadata?.agencies || [],
    statuses: data?.metadata?.statuses || []
  };
  const pagination = data?.pagination;

  const handlePdfDownload = useCallback(async (order: Order) => {
    if (!order.link) return;
    try {
      const response = await fetch(order.link);
      if (!response.ok) throw new Error('PDF not found');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  }, []);

  const handleFilterChange = useCallback((filterType: FilterType, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
      page: filterType === 'page' ? Number(value) : 1
    }));
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && e.target === document.body) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]');
        if (searchInput instanceof HTMLInputElement) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      if (stored) {
        setRecentlyViewed(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recently viewed items:', e);
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleRefresh}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(prev => prev === 'expanded' ? 'compact' : 'expanded')}
              >
                {viewMode === 'expanded' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowTimeline(!showTimeline)}
              >
                <BarChart2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsComparing(!isComparing)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              {lastUpdate && (
                <span className="text-sm text-gray-500">
                  Last updated: {format(new Date(lastUpdate), 'PPp')}
                </span>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", { "animate-spin": isRefreshing })} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showTimeline && orders.length > 0 && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <TimelineChart orders={orders} />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="hidden md:block">
          <FilterBar 
            filters={filters}
            metadata={metadata}
            onFilterChange={handleFilterChange}
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  viewMode={viewMode}
                  isComparing={isComparing}
                  compareItems={compareItems}
                  onCompareToggle={(order) => {
                    setCompareItems(prev => 
                      prev.find(i => i.id === order.id)
                        ? prev.filter(i => i.id !== order.id)
                        : [...prev, order].slice(-2)
                    );
                  }}
                  onRecentlyViewed={(order) => {
                    const newRecentlyViewed = [
                      order,
                      ...recentlyViewed.filter(o => o.id !== order.id)
                    ].slice(0, 5);
                    setRecentlyViewed(newRecentlyViewed);
                    localStorage.setItem('recentlyViewed', JSON.stringify(newRecentlyViewed));
                  }}
                  onFilterChange={handleFilterChange}
                  onPdfDownload={handlePdfDownload}
                />
              ))}

              {pagination && orders.length > 0 && (
                <Pagination
                  currentPage={filters.page}
                  totalPages={Math.ceil(pagination.total / filters.limit)}
                  onPageChange={(page) => handleFilterChange('page', page.toString())}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden fixed bottom-6 right-6 flex flex-col gap-2">
        <Button
          size="icon"
          className="rounded-full h-12 w-12 shadow-lg"
          onClick={() => setMobileFiltersVisible(true)}
        >
          <Filter className="h-6 w-6" />
        </Button>
        <Button
          size="icon"
          className="rounded-full h-12 w-12 shadow-lg"
          onClick={scrollToTop}
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      </div>

      <MobileFilters
        filters={filters}
        metadata={metadata}
        onFilterChange={handleFilterChange}
        open={mobileFiltersVisible}
        onOpenChange={setMobileFiltersVisible}
      />
    </div>
  );
};

export default ExecutiveOrderTracker;