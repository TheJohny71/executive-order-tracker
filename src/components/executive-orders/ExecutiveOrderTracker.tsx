'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Filter, BarChart2, List, Grid, ArrowUp, RefreshCw
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
import { OrderCard } from './order-card';
import { TimelineChart } from './timeline-chart';
import { useOrders } from '@/hooks/useOrders';
import { Pagination } from "@/components/ui/pagination";
import type { Order, FilterType, OrderFilters } from '@/types';
import { LoadingSkeleton } from './loading-skeleton';

const ExecutiveOrderTracker = () => {
  const [filters, setFilters] = useState<OrderFilters>({
    type: 'all',
    category: 'all',
    agency: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 10
  });
  const [viewMode, setViewMode] = useState<'expanded' | 'compact'>('expanded');
  const [recentlyViewed, setRecentlyViewed] = useState<Order[]>([]);
  const [showTimeline, setShowTimeline] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [compareItems, setCompareItems] = useState<Order[]>([]);
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data, error, loading, refresh, lastUpdate } = useOrders(filters);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('recentlyViewed');
      if (stored) {
        try {
          setRecentlyViewed(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse recently viewed orders:', e);
        }
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

    if (typeof window !== 'undefined') {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, []);

  const handlePdfDownload = async (order: Order) => {
    try {
      const response = await fetch(order.pdfUrl);
      if (!response.ok) throw new Error('PDF not found');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order.identifier}.pdf`;
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error.toString()}</p>
            <Button onClick={() => setFilters(prev => ({ ...prev }))}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStatusCounts = () => {
    if (!data?.orders) return null;
    const counts = data.orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([status, count]) => (
      <Badge key={status} variant="secondary">
        {status}: {count}
      </Badge>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Executive Order Tracker</h1>
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <span>Last Updated: {lastUpdate?.toLocaleString() || 'Never'}</span>
                  <span className="mx-2">•</span>
                  <span>Track and analyze White House executive orders and memoranda</span>
                </div>
                <div className="mt-2 flex gap-2">
                  {renderStatusCounts()}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
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
      </div>

      {showTimeline && data?.orders && (
        <div className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <TimelineChart orders={data.orders} />
          </div>
        </div>
      )}

      {recentlyViewed.length > 0 && (
        <div className="bg-gray-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h2 className="text-sm font-medium text-gray-500">Recently Viewed</h2>
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {recentlyViewed.map(order => (
                <Button key={order.id} variant="outline" size="sm">
                  {order.title}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              type="search"
              className="pl-10"
              placeholder="Search orders... (Press '/' to focus)"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Executive Order">Executive Order</SelectItem>
              <SelectItem value="Memorandum">Memorandum</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.category} onValueChange={(v) => handleFilterChange('category', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {data?.metadata.categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.agency} onValueChange={(v) => handleFilterChange('agency', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Agency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agencies</SelectItem>
              {data?.metadata.agencies.map(agency => (
                <SelectItem key={agency} value={agency}>{agency}</SelectItem>
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

        <div className="mt-4 text-sm text-gray-500">
          Showing {data?.orders.length || 0} of {data?.pagination.total || 0} orders
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-4">
            {data?.orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
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

            {data?.pagination && (
              <Pagination
                currentPage={filters.page}
                totalPages={Math.ceil(data.pagination.total / filters.limit)}
                onPageChange={(page) => handleFilterChange('page', page.toString())}
              />
            )}
          </div>
        )}
      </div>

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
};

export default ExecutiveOrderTracker;