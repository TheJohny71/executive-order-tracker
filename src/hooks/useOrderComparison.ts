// File: src/hooks/useOrderComparison.ts
// Description: Hook for managing order comparison state and logic

import { useState, useCallback } from 'react';
import type { Order } from '@/types';

interface UseOrderComparisonReturn {
  selectedOrders: Order[];
  isComparing: boolean;
  canAddToComparison: boolean;
  addOrder: (order: Order) => void;
  removeOrder: (orderId: string) => void;
  clearComparison: () => void;
  toggleComparison: () => void;
}

export function useOrderComparison(maxComparisons = 2): UseOrderComparisonReturn {
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  const canAddToComparison = selectedOrders.length < maxComparisons;

  const addOrder = useCallback((order: Order) => {
    setSelectedOrders(prev => {
      if (prev.length >= maxComparisons) return prev;
      if (prev.some(o => o.id === order.id)) return prev;
      return [...prev, order];
    });
  }, [maxComparisons]);

  const removeOrder = useCallback((orderId: string) => {
    setSelectedOrders(prev => prev.filter(order => order.id !== orderId));
  }, []);

  const clearComparison = useCallback(() => {
    setSelectedOrders([]);
    setIsComparing(false);
  }, []);

  const toggleComparison = useCallback(() => {
    setIsComparing(prev => !prev);
  }, []);

  return {
    selectedOrders,
    isComparing,
    canAddToComparison,
    addOrder,
    removeOrder,
    clearComparison,
    toggleComparison
  };
}