// src/hooks/useOrders.ts
import { useState, useEffect, useCallback } from "react";
import type { OrderFilters, OrdersResponse } from "@/types";

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

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/orders?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setLastUpdate(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    data,
    error,
    loading,
    refresh: fetchOrders,
    lastUpdate,
  };
}
