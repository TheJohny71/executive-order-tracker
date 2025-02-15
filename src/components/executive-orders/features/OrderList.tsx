// File: src/components/executive-orders/features/OrderList.tsx
import React from 'react';
import { OrderCard } from '../ui/OrderCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Order } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OrderListProps {
  orders: Order[];
  isLoading: boolean;
  selectedOrders: Order[];
  onOrderSelect: (order: Order) => void;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg">
          <Skeleton className="h-4 w-1/4 mb-2" />
          <Skeleton className="h-6 w-3/4 mb-4" />
          <Skeleton className="h-20 w-full" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderList({
  orders,
  isLoading,
  selectedOrders,
  onOrderSelect
}: OrderListProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (orders.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No orders found matching the current filters.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          isSelectable={true}
          onSelect={() => onOrderSelect(order)}
          isComparing={selectedOrders.some(selected => selected.id === order.id)}
        />
      ))}

      {selectedOrders.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-10">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedOrders.length} {selectedOrders.length === 1 ? 'order' : 'orders'} selected
            </Badge>
            {selectedOrders.length === 2 && (
              <Badge variant="default">
                Ready to compare
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}