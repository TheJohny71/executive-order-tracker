// File: src/components/executive-orders/ExecutiveOrderTracker.tsx
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Calendar, 
  ChevronDown, 
  BarChart2, 
  List, 
  Grid, 
  Bookmark 
} from 'lucide-react';
import { TrackerLayout } from './layouts/TrackerLayout';
import { TrackerHeader } from './layouts/TrackerHeader';
import { TrackerSidebar } from './layouts/TrackerSidebar';
import { OrderList } from './features/OrderList';
import { StatsCards } from './features/StatsCards';
import { useOrders } from '@/hooks/useOrders';
import type { OrderFilters, Order } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const initialFilters: OrderFilters = {
  type: 'all',
  category: '',
  agency: '',
  dateFrom: '',
  dateTo: '',
  search: '',
  page: 1,
  limit: 10,
  statusId: undefined,
  sort: 'desc'
};

export function ExecutiveOrderTracker() {
  const [viewMode, setViewMode] = useState<'standard' | 'focus'>('standard');
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const searchParams = useSearchParams();

  // Get current filters from URL params
  const currentFilters: OrderFilters = {
    ...initialFilters,
    type: (searchParams?.get('type') as any) || initialFilters.type,
    category: searchParams?.get('category') || initialFilters.category,
    agency: searchParams?.get('agency') || initialFilters.agency,
    dateFrom: searchParams?.get('dateFrom') || initialFilters.dateFrom,
    dateTo: searchParams?.get('dateTo') || initialFilters.dateTo,
    search: searchParams?.get('search') || initialFilters.search,
    page: Number(searchParams?.get('page')) || initialFilters.page,
    limit: Number(searchParams?.get('limit')) || initialFilters.limit,
    statusId: searchParams?.get('statusId') ? 
      Number(searchParams.get('statusId')) : initialFilters.statusId,
    sort: searchParams?.get('sort') || initialFilters.sort,
  };

  // Fetch orders with current filters
  const { 
    data, 
    error, 
    loading, 
    refresh: refreshOrders,
    lastUpdate 
  } = useOrders(currentFilters);

  const handleFilterChange = (type: keyof OrderFilters, value: string) => {
    const newParams = new URLSearchParams(searchParams?.toString());
    if (value) {
      newParams.set(type, value);
    } else {
      newParams.delete(type);
    }
    // Reset page when changing filters
    if (type !== 'page') {
      newParams.delete('page');
    }
    window.history.pushState({}, '', `?${newParams.toString()}`);
    refreshOrders();
  };

  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting orders:', selectedOrders.length ? selectedOrders : data?.orders);
  };

  const handleOrderSelect = (order: Order) => {
    setSelectedOrders(prev => {
      const isSelected = prev.some(o => o.id === order.id);
      if (isSelected) {
        return prev.filter(o => o.id !== order.id);
      }
      if (prev.length >= 2) {
        return [prev[1], order]; // Keep only last 2 selected
      }
      return [...prev, order];
    });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <p className="text-red-600 mb-4">Error loading orders: {error}</p>
        <Button onClick={refreshOrders}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TrackerHeader 
        onSearch={(query) => handleFilterChange('search', query)}
        onCreateNew={() => console.log('Create new')}
        onThemeToggle={() => console.log('Toggle theme')}
      />

      <main className="max-w-screen-2xl mx-auto px-4 py-8">
        <StatsCards 
          stats={{
            totalOrders: data?.orders.length || 0,
            activeOrders: data?.orders.filter(o => 
              o.status.name.toLowerCase() === 'active').length || 0,
            newOrdersThisMonth: data?.orders.filter(o => {
              const orderDate = new Date(o.datePublished);
              const today = new Date();
              return orderDate.getMonth() === today.getMonth() && 
                     orderDate.getFullYear() === today.getFullYear();
            }).length || 0,
            pendingReview: data?.orders.filter(o => 
              o.status.name.toLowerCase() === 'pending').length || 0,
          }}
          className="mb-8"
        />

        <div className="flex gap-6">
          <TrackerSidebar
            filters={currentFilters}
            metadata={data?.metadata || { categories: [], agencies: [], statuses: [] }}
            onFilterChange={handleFilterChange}
            onExport={handleExport}
            onCompare={() => setSelectedOrders([])}
            onClearFilters={() => {
              window.history.pushState({}, '', window.location.pathname);
              refreshOrders();
            }}
            activeOrderCount={data?.orders.filter(o => 
              o.status.name.toLowerCase() === 'active').length || 0}
            pendingReviewCount={data?.orders.filter(o => 
              o.status.name.toLowerCase() === 'pending').length || 0}
            thisMonthCount={data?.orders.filter(o => {
              const orderDate = new Date(o.datePublished);
              const today = new Date();
              return orderDate.getMonth() === today.getMonth() && 
                     orderDate.getFullYear() === today.getFullYear();
            }).length || 0}
          />

          <div className="flex-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Executive Orders</CardTitle>
                <div className="flex items-center space-x-2">
                  <Select 
                    defaultValue="date-desc"
                    onValueChange={(value) => handleFilterChange('sort', value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                      <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'standard' ? 'focus' : 'standard')}
                  >
                    {viewMode === 'standard' ? 'Focus Mode' : 'Standard Mode'}
                  </Button>

                  <Select defaultValue="list">
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="View" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">
                        <Grid className="h-4 w-4 mr-2" />
                        Grid
                      </SelectItem>
                      <SelectItem value="list">
                        <List className="h-4 w-4 mr-2" />
                        List
                      </SelectItem>
                      <SelectItem value="timeline">
                        <BarChart2 className="h-4 w-4 mr-2" />
                        Timeline
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent>
                <OrderList
                  orders={data?.orders || []}
                  isLoading={loading}
                  selectedOrders={selectedOrders}
                  onOrderSelect={handleOrderSelect}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}