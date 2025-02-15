// File: src/components/executive-orders/ui/OrderCard.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Order } from '@/types';

interface OrderCardProps {
  order: Order;
  isComparing: boolean;
  onSelect: () => void;
}

const getBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  isComparing,
  onSelect,
}) => {
  return (
    <div className="bg-card p-6 rounded-lg border shadow-sm">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <Badge variant={getBadgeVariant(order.status.name)}>
              {order.status.name}
            </Badge>
            <h3 className="text-lg font-semibold mt-2">{order.title}</h3>
            <p className="text-sm text-muted-foreground">
              Order Number: {order.number || 'N/A'}
            </p>
          </div>
          
          {isComparing && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSelect}
            >
              Compare
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Published: {new Date(order.datePublished).toLocaleDateString()}
          </p>
          <p className="text-sm">{order.summary}</p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Agency</h4>
          <p className="text-sm">{order.agency || 'N/A'}</p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Category</h4>
          <p className="text-sm">{order.category}</p>
        </div>

        <div className="flex gap-2">
          {order.link && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(order.link, '_blank')}
            >
              View Source
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};