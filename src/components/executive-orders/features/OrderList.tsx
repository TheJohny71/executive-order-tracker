// File: src/components/executive-orders/features/OrderList.tsx
// Description: Displays the list of orders with support for comparison mode

import React from 'react';
import { Card } from '@/components/ui/card';
import { OrderCard } from '../ui/OrderCard';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { Pagination } from '@/components/ui/pagination';
import type { Order, PaginationData } from '@/types';

interface OrderListProps {
  orders: Order[];
  loading: boolean;
  isComparing: boolean;
  onOrderSelect: (order: Order) => void;
  pagination?: PaginationData;
  onPageChange: (page: number) => void;
}

export function OrderList({
  orders,
  loading,
  isComparing,
  onOrderSelect,
  pagination,
  onPageChange
}: OrderListProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Orders list */}
      <div className="grid gap-4">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            isSelectable={isComparing}
            onSelect={() => onOrderSelect(order)}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="mt-6">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}