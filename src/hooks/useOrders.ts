import { useState, useEffect, useCallback } from 'react';
import type { OrderFilters, OrdersResponse, Order } from '@/types';

interface UseOrdersReturn {
  data: OrdersResponse | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  lastUpdate: string | null;
}

export function useOrders(filters: OrderFilters): UseOrdersReturn {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      // Fetch data
      const response = await fetch(`/api/orders?${queryParams.toString()}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = (await response.json()) as Partial<OrdersResponse>;
      
      // Validate response structure
      if (!result.orders || !Array.isArray(result.orders)) {
        throw new Error('Invalid response format');
      }

      // Transform dates from strings to Date objects
      const transformedOrders = result.orders.map((order: Partial<Order>) => ({
        ...order,
        date: order.datePublished ? new Date(order.datePublished) : new Date(),
      }));

      setData({
        orders: transformedOrders as Order[],
        total: result.total ?? 0,
        page: result.page ?? 1,
        pageSize: result.pageSize ?? 10,
      });
      setLastUpdate(new Date().toISOString());
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching orders');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const refresh = useCallback(async () => {
    await fetchOrders();
  }, [fetchOrders]);

  // Fetch data when filters change
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setData(null);
      setError(null);
      setLoading(false);
    };
  }, []);

  return {
    data,
    error,
    loading,
    refresh,
    lastUpdate,
  };
}

// Optional: Add additional hooks if needed
export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

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

  const addToRecentlyViewed = useCallback((id: string) => {
    setRecentlyViewed(prev => {
      const newRecent = [id, ...prev.filter(i => i !== id)].slice(0, 5);
      localStorage.setItem('recentlyViewed', JSON.stringify(newRecent));
      return newRecent;
    });
  }, []);

  return {
    recentlyViewed,
    addToRecentlyViewed,
  };
}