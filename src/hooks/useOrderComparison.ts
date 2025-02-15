// File: src/hooks/useOrderComparison.ts
import { useState } from 'react';
import type { Order } from '@/types';

export function useOrderComparison() {
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);

  const toggleOrderSelection = (order: Order) => {
    setSelectedOrders(prev => {
      const orderIndex = prev.findIndex(selected => selected.id === order.id);
      if (orderIndex === -1) {
        // Add order if not already selected and limit to 2 selections
        return prev.length < 2 ? [...prev, order] : prev;
      } else {
        // Remove order if already selected
        return prev.filter(selected => selected.id !== order.id);
      }
    });
  };

  const clearSelectedOrders = () => {
    setSelectedOrders([]);
  };

  return {
    selectedOrders,
    toggleOrderSelection,
    clearSelectedOrders
  };
}