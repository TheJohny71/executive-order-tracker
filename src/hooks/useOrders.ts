// src/hooks/useOrders.ts
import { useState, useEffect } from 'react';
import type { OrdersResponse, OrderFilters } from '@/types';

export function useOrders(filters: OrderFilters) {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams(
          Object.entries(filters)
            .filter(([, v]) => v != null && v !== 'all')
            .map(([k, v]) => [k, String(v)])
        );

        const response = await fetch(`/api/orders?${queryParams}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const jsonData = await response.json();
        setData(jsonData);
        setLastUpdate(new Date());
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // Set up polling for new orders every 5 minutes
    const pollInterval = setInterval(fetchOrders, 5 * 60 * 1000);

    return () => clearInterval(pollInterval);
  }, [filters]);

  // Manual refresh function
  const refresh = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/orders/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || ''
        }
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      // Fetch updated orders after refresh
      const queryParams = new URLSearchParams(
        Object.entries(filters)
          .filter(([, v]) => v != null && v !== 'all')
          .map(([k, v]) => [k, String(v)])
      );
      
      const ordersResponse = await fetch(`/api/orders?${queryParams}`);
      if (!ordersResponse.ok) throw new Error(`HTTP error! status: ${ordersResponse.status}`);
      
      const jsonData = await ordersResponse.json();
      setData(jsonData);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return { 
    data, 
    error, 
    loading, 
    refresh,
    lastUpdate 
  };
}