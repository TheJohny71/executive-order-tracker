// File: src/hooks/useOrderStats.ts
// Description: Custom hook for calculating order statistics

import { useMemo } from 'react';
import type { Order } from '@/types';
import type { DashboardStats, OrderStats, OrderStatusDistribution, OrderTypeDistribution } from '@/types/stats';

interface UseOrderStatsProps {
  orders: Order[];
  lastUpdate?: string | null;
}

export function useOrderStats({ orders, lastUpdate }: UseOrderStatsProps): DashboardStats {
  const stats = useMemo(() => {
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Calculate basic stats
    const orderStats: OrderStats = {
      totalOrders: orders.length,
      activeOrders: orders.filter(order => order.status?.name?.toLowerCase() === 'active').length,
      newOrdersThisMonth: orders.filter(order => new Date(order.datePublished) >= firstDayOfMonth).length,
      pendingReview: orders.filter(order => order.status?.name?.toLowerCase() === 'pending').length,
    };

    // Calculate status distribution
    const statusCounts = orders.reduce((acc, order) => {
      const status = order.status?.name || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDistribution: OrderStatusDistribution[] = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: (count / orders.length) * 100,
    }));

    // Calculate type distribution
    const typeCounts = orders.reduce((acc, order) => {
      acc[order.type] = (acc[order.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeDistribution: OrderTypeDistribution[] = Object.entries(typeCounts).map(([type, count]) => ({
      type: type as Order['type'],
      count,
      percentage: (count / orders.length) * 100,
    }));

    return {
      orderStats,
      statusDistribution,
      typeDistribution,
      lastUpdated: lastUpdate ? new Date(lastUpdate) : new Date(),
    };
  }, [orders, lastUpdate]);

  return stats;
}