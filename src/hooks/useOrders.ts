import { useState, useEffect } from 'react';
import type { OrdersResponse, OrderFilters } from '@/types';

export function useOrders(filters: OrderFilters) {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        // Filter out null/undefined values and create query params
        const queryParams = new URLSearchParams(
          Object.entries(filters)
            .filter(([, v]) => v != null && v !== 'all')  // Removed unused k parameter
            .map(([k, v]) => [k, String(v)])
        );

        const response = await fetch(`/api/orders?${queryParams}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred while fetching orders'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [filters]);

  return { data, error, loading };
}