// File: src/components/executive-orders/features/OrderList.tsx
import React from 'react';
import { OrderCard } from '../ui/OrderCard';
import { Pagination } from '@/components/ui/pagination';
import { LoadingSkeleton } from '@/components/ui/skeleton'; // Fixed import path
import type { Order, PaginationData } from '@/types';

interface OrderListProps {
  orders: Order[];
  loading: boolean;
  isComparing: boolean;
  onOrderSelect: (order: Order) => void;
  pagination?: PaginationData;
  onPageChange: (page: number) => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  loading,
  isComparing,
  onOrderSelect,
  pagination,
  onPageChange,
}) => {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!orders.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No orders found</p>
      </div>
    );
  }

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;
  const currentPage = pagination ? pagination.page : 1;

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            isComparing={isComparing}
            onSelect={() => onOrderSelect(order)}
          />
        ))}
      </div>

      {pagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
};