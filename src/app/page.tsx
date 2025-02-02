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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useOrders } from '@/hooks/useOrders';
import type { Order } from '@/types';

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
    <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
    <div className="h-32 bg-gray-200 rounded-lg"></div>
  </div>
);

const ExecutiveOrderTracker = () => {
  // State Management
  const [filters, setFilters] = useState({
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
  const [_mobileFiltersVisible, setMobileFiltersVisible] = useState(false);

  // Fetch data using custom hook
  const { data, error, loading } = useOrders(filters);

  // Load recently viewed from localStorage on mount
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

  // Keyboard shortcut for search
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
      return [...prev, order].slice(0, 2); // Limit to comparing 2 items
    });
  };

  // Process timeline data
  const timelineData = React.useMemo(() => {
    if (!data?.orders) return [];
    
    const ordersByMonth: Record<string, number> = {};
    data.orders.forEach(order => {
      const date = new Date(order.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      ordersByMonth[monthKey] = (ordersByMonth[monthKey] || 0) + 1;
    });

    return Object.entries(ordersByMonth)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [data?.orders]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Error State
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
                title={viewMode === 'expanded' ? 'Switch to compact view' : 'Switch to expanded view'}
              >
                {viewMode === 'expanded' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowTimeline(!showTimeline)}
                title={showTimeline ? 'Hide timeline' : 'Show timeline'}
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

      {/* Timeline Visualization */}
      {showTimeline && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="h-48 bg-gray-50 rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${month}/${year.slice(2)}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'long' })} ${year}`;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

 {/* Recently Viewed */}
 {recentlyViewed.length > 0 && (
        <div className="bg-gray-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h2 className="text-sm font-medium text-gray-500">Recently Viewed</h2>
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {recentlyViewed.map(order => (
                <Button 
                  key={order.id} 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const element = document.getElementById(order.id);
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {order.title}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              className="pl-10"
              placeholder="Search orders... (Press '/' to focus)"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
            />
          </div>
          
          <Select 
            value={filters.type} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, type: value, page: 1 }))}
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
            onValueChange={(value) => setFilters(prev => ({ ...prev, category: value, page: 1 }))}
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
            onValueChange={(value) => setFilters(prev => ({ ...prev, agency: value, page: 1 }))}
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
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value, page: 1 }))}
            className="w-full"
          />
        </div>

        {/* Filter results count */}
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
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Comparing {compareItems.length} Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {compareItems.map(order => (
                      <div key={order.id} className="space-y-4">
                        <h3 className="font-medium">{order.title}</h3>
                        <div className="text-sm">
                          <p><strong>Type:</strong> {order.type}</p>
                          <p><strong>Date:</strong> {new Date(order.date).toLocaleDateString()}</p>
                          <p><strong>Categories:</strong> {order.categories.map(c => c.name).join(', ')}</p>
                          <p><strong>Agencies:</strong> {order.agencies.map(a => a.name).join(', ')}</p>
                        </div>
                        <p className="text-sm text-gray-600">{order.summary}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Cards */}
            {data?.orders.map((order) => (
              <Card 
                key={order.id}
                id={order.id}
                className={`transform transition-all duration-200 hover:shadow-lg
                  border-l-4 ${order.categories[0]?.name.toLowerCase() || ''}`}
              >
                <Collapsible>
                  <CardHeader className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={order.type === 'Executive Order' ? 'default' : 'secondary'}>
                            {order.type}
                          </Badge>
                          {order.orderNumber && (
                            <Badge variant="outline">#{order.orderNumber}</Badge>
                          )}
                          {order.isNew && (
                            <Badge variant="destructive">New</Badge>
                          )}
                          <span className="text-sm text-gray-500">
                            {new Date(order.date).toLocaleDateString()}
                          </span>
                        </div>
                        <CollapsibleTrigger 
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                          onClick={() => addToRecentlyViewed(order)}
                        >
                          <CardTitle className="text-xl">{order.title}</CardTitle>
                          <ChevronDown className="h-4 w-4" />
                        </CollapsibleTrigger>
                      </div>
                      {isComparing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleCompare(order)}
                        >
                          {compareItems.find(o => o.id === order.id) ? 'Remove' : 'Compare'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="px-6 pb-6 pt-0">
                      <div className="flex justify-between items-start">
                        <div className="space-y-4 flex-1">
                          <div>
                            <h3 className="font-medium text-gray-900">Summary</h3>
                            <p className="mt-1 text-gray-600">{order.summary}</p>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">Categories</h3>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {order.categories.map((category) => (
                                <Badge 
                                  key={category.name} 
                                  variant="outline"
                                  className="cursor-pointer hover:bg-gray-100"
                                  onClick={() => setFilters(prev => ({ 
                                    ...prev, 
                                    category: category.name,
                                    page: 1 
                                  }))}
                                >
                                  {category.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">Key Agencies</h3>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {order.agencies.map((agency) => (
                                <Badge 
                                  key={agency.name} 
                                  variant="outline"
                                  className="cursor-pointer hover:bg-gray-100"
                                  onClick={() => setFilters(prev => ({ 
                                    ...prev, 
                                    agency: agency.name,
                                    page: 1 
                                  }))}
                                >
                                  {agency.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {order.notes && (
                            <div>
                              <h3 className="font-medium text-gray-900">Notes</h3>
                              <p className="mt-1 text-gray-600">{order.notes}</p>
                            </div>
                          )}
                        </div>
                        <div className="ml-6 flex flex-col items-end">
                          <a
                            href={order.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            View on whitehouse.gov
                          </a>
                          <span className="text-sm text-gray-500 mt-2">Official Source</span>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}

            {/* Pagination */}
            {!loading && data?.pagination && data.pagination.pages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <Button
                  variant="outline"
                  disabled={filters.page === 1}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 py-2 text-sm text-gray-700">
                  Page {data.pagination.currentPage} of {data.pagination.pages}
                </span>
                <Button
                  variant="outline"
                  disabled={filters.page === data.pagination.pages}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

 {/* Mobile floating action buttons */}
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
};

export default ExecutiveOrderTracker;
              