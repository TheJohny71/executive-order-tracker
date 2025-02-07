'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { 
  Search, 
  Filter, 
  BarChart2, 
  List, 
  Grid, 
  ArrowUp, 
  RefreshCw,
  Download,
  Calendar,
  SlidersHorizontal
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { OrderCard } from './order-card';
import { TimelineChart } from './timeline-chart';
import { useOrders } from '@/hooks/useOrders';
import { Pagination } from "./pagination";
import { DocumentType } from '@prisma/client';
import type { Order, FilterType, OrderFilters, OrderMetadata } from '@/types';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

// Types
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface LoadingSkeletonProps {
  count?: number;
}

interface StatusCountsProps {
  orders: Order[];
}

interface FilterBarProps {
  filters: OrderFilters;
  metadata: OrderMetadata;
  onFilterChange: (type: FilterType, value: string) => void;
}

interface MobileFiltersProps {
  filters: OrderFilters;
  metadata: OrderMetadata;
  onFilterChange: (type: FilterType, value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Error Boundary Component
function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Error caught by boundary:', error);
      setHasError(true);
      setErrorMessage(error.message || 'An unexpected error occurred');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

// Loading Skeleton Component
const LoadingSkeleton = ({ count = 3 }: LoadingSkeletonProps) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
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
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Status Counts Component
const StatusCounts = ({ orders }: StatusCountsProps) => {
  if (!orders.length) return null;
  
  const counts = orders.reduce((acc, order) => {
    if (order.status?.name) {
      acc[order.status.name] = (acc[order.status.name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(counts).map(([status, count]) => (
        <Badge key={status} variant="secondary">
          {status}: {count}
        </Badge>
      ))}
    </div>
  );
};

// Filter Bar Component
const FilterBar = ({ filters, metadata, onFilterChange }: FilterBarProps) => {
  return (
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
      
      <Select value={filters.type || ''} onValueChange={(v) => onFilterChange('type', v)}>
        <SelectTrigger>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Types</SelectItem>
          <SelectItem value={DocumentType.EXECUTIVE_ORDER}>Executive Order</SelectItem>
          <SelectItem value={DocumentType.MEMORANDUM}>Memorandum</SelectItem>
          <SelectItem value={DocumentType.PROCLAMATION}>Proclamation</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.category} onValueChange={(v) => onFilterChange('category', v)}>
        <SelectTrigger>
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Categories</SelectItem>
          {metadata.categories.map(category => (
            <SelectItem key={category} value={category}>{category}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.agency} onValueChange={(v) => onFilterChange('agency', v)}>
        <SelectTrigger>
          <SelectValue placeholder="Agency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Agencies</SelectItem>
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
};

// Mobile Filters Component
const MobileFilters = ({ filters, metadata, onFilterChange, open, onOpenChange }: MobileFiltersProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <FilterBar 
            filters={filters}
            metadata={metadata}
            onFilterChange={onFilterChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Main Component
const ExecutiveOrderTracker = () => {
  // State management
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
  const [recentlyViewed, setRecentlyViewed] = useState<Order[]>([]);
  const [showTimeline, setShowTimeline] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [compareItems, setCompareItems] = useState<Order[]>([]);
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch data using custom hook
  const { data, error, loading, refresh, lastUpdate } = useOrders(filters);

  // Safe data access
  const orders = data?.orders || [];
  const metadata = {
    categories: data?.metadata?.categories || [],
    agencies: data?.metadata?.agencies || [],
    statuses: data?.metadata?.statuses || []
  };
  const pagination = data?.pagination || { total: 0, page: 1, limit: 10 };

  // Effects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('recentlyViewed');
        if (stored) {
          setRecentlyViewed(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to parse recently viewed orders:', e);
      }
    }
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

  // Handlers
  const handlePdfDownload = async (order: Order) => {
    if (!order.link) {
      console.error('No PDF link available');
      return;
    }

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
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFilterChange = useCallback((filterType: FilterType, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
      page: filterType === 'page' ? Number(value) : 1
    }));
  }, []);

  const addToRecentlyViewed = useCallback((order: Order) => {
    setRecentlyViewed(prev => {
      const newRecent = [order, ...prev.filter(o => o.id !== order.id)].slice(0, 5);
      if (typeof window !== 'undefined') {
        localStorage.setItem('recentlyViewed', JSON.stringify(newRecent));
      }
      return newRecent;
    });
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Error handling
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => setFilters(prev => ({ ...prev }))}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main render
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewMode(prev => prev === 'expanded' ? 'compact' : 'expanded')}
                >
                  {viewMode === 'expanded' ? <List /> : <Grid />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowTimeline(!showTimeline)}
                >
                  <BarChart2 />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
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
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </Button>
              </div>
            </div>
            <StatusCounts orders={orders} />
          </div>
        </div>

        {/* Timeline Section */}
        {showTimeline && orders.length > 0 && (
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <TimelineChart orders={orders} />
            </div>
          </div>
        )}

        {/* Recently Viewed Section */}
        {recentlyViewed.length > 0 && (
          <div className="bg-gray-50 border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <h2 className="text-sm font-medium text-gray-500">Recently Viewed</h2>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                {recentlyViewed.map(order => (
                  <Button 
                    key={order.id} 
                    variant="outline" 
                    size="sm"
                    onClick={() => addToRecentlyViewed(order)}
                  >
                    {order.number}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Desktop Filters */}
          <div className="hidden md:block">
            <FilterBar 
              filters={filters}
              metadata={metadata}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Mobile Filters */}
          <MobileFilters
            filters={filters}
            metadata={metadata}
            onFilterChange={handleFilterChange}
            open={mobileFiltersVisible}
            onOpenChange={setMobileFiltersVisible}
          />

          {/* Orders List */}
          <div className="mt-4">
            {loading ? (
              <LoadingSkeleton count={5} />
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
                      const isCompared = compareItems.find(i => i.id === order.id);
                      if (isCompared) {
                        setCompareItems(compareItems.filter(i => i.id !== order.id));
                      } else if (compareItems.length < 2) {
                        setCompareItems([...compareItems, order]);
                      }
                    }}
                    onRecentlyViewed={addToRecentlyViewed}
                    onFilterChange={handleFilterChange}
                    onPdfDownload={handlePdfDownload}
                  />
                ))}

                {orders.length === 0 && !loading && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <p className="text-gray-500">No orders found</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setFilters({
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
                        })}
                      >
                        Clear Filters
                      </Button>
                    </CardContent>
                  </Card>
                )}

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

        {/* Mobile Actions */}
        <div className="md:hidden fixed bottom-6 right-6 flex flex-col gap-2">
          <Button
            size="icon"
            className="rounded-full h-12 w-12 shadow-lg"
            onClick={() => setMobileFiltersVisible(true)}
          >
            <Filter className="h-6 w-6" />
          </Button>
          {window.pageYOffset > 100 && (
            <Button
              size="icon"
              className="rounded-full h-12 w-12 shadow-lg"
              onClick={scrollToTop}
            >
              <ArrowUp className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ExecutiveOrderTracker;