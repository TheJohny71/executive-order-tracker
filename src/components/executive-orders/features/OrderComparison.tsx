// File: src/hooks/useOrderComparison.ts
import { useState, useCallback } from 'react';
import type { Order } from '@/types';

export function useOrderComparison() {
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);

  const toggleOrderSelection = useCallback((order: Order) => {
    setSelectedOrders(prev => {
      // Convert string IDs to numbers for comparison if needed
      const orderId = typeof order.id === 'string' ? parseInt(order.id, 10) : order.id;
      const orderIndex = prev.findIndex(selected => 
        typeof selected.id === 'string' ? parseInt(selected.id, 10) === orderId : selected.id === orderId
      );
      
      if (orderIndex === -1) {
        // Add order if not already selected and limit to 2 selections
        return prev.length < 2 ? [...prev, order] : prev;
      } else {
        // Remove order if already selected
        return prev.filter((_, index) => index !== orderIndex);
      }
    });
  }, []);

  const clearSelectedOrders = useCallback(() => {
    setSelectedOrders([]);
  }, []);

  const isOrderSelected = useCallback((orderId: number | string) => {
    const id = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
    return selectedOrders.some(order => {
      const selectedId = typeof order.id === 'string' ? parseInt(order.id, 10) : order.id;
      return selectedId === id;
    });
  }, [selectedOrders]);

  const canSelectMore = useCallback(() => 
    selectedOrders.length < 2,
  [selectedOrders]);

  return {
    selectedOrders,
    toggleOrderSelection,
    clearSelectedOrders,
    isOrderSelected,
    canSelectMore
  };
}