// File: src/components/executive-orders/features/OrderComparison.tsx
import React from 'react';
import { X, GitCompare, Link as LinkIcon } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrderCard } from '../ui/OrderCard';
import type { Order } from '@/types';

interface OrderComparisonProps {
  orders: Order[];
  onClose: () => void;
}

const ComparisonDiffBadge = ({ label, isDifferent }: { label: string; isDifferent: boolean }) => (
  <Badge variant={isDifferent ? "destructive" : "default"}>
    {label} {isDifferent ? "Different" : "Same"}
  </Badge>
);

function OrderComparison({ orders, onClose }: OrderComparisonProps) {
  const handleSourceClick = (url: string | null) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Compare order properties
  const compareOrders = () => {
    if (orders.length !== 2) return null;
    
    const [order1, order2] = orders;
    return {
      agency: order1.agency !== order2.agency,
      category: order1.category !== order2.category,
      status: order1.status.name !== order2.status.name,
      datePublished: new Date(order1.datePublished).getTime() !== new Date(order2.datePublished).getTime()
    };
  };

  const differences = compareOrders();

  const renderDifferencesHighlight = (order: Order, otherOrder: Order | undefined) => {
    if (!otherOrder) return null;

    return (
      <div className="mt-4 space-y-2">
        {order.agency !== otherOrder.agency && (
          <div className="text-sm">
            <span className="font-medium">Agency: </span>
            <span className="text-red-600">{order.agency}</span>
          </div>
        )}
        {order.category !== otherOrder.category && (
          <div className="text-sm">
            <span className="font-medium">Category: </span>
            <span className="text-red-600">{order.category}</span>
          </div>
        )}
        {order.status.name !== otherOrder.status.name && (
          <div className="text-sm">
            <span className="font-medium">Status: </span>
            <span className="text-red-600">{order.status.name}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Order Comparison</h2>
          {differences && (
            <div className="flex gap-2 flex-wrap">
              <ComparisonDiffBadge label="Agency" isDifferent={differences.agency} />
              <ComparisonDiffBadge label="Category" isDifferent={differences.category} />
              <ComparisonDiffBadge label="Status" isDifferent={differences.status} />
              <ComparisonDiffBadge label="Date" isDifferent={differences.datePublished} />
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Close Comparison
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {orders.map((order, index) => (
          <div key={order.id} className="relative">
            <OrderCard
              order={order}
              isSelectable={false}
              className={
                differences
                  ? "border-2 " +
                    (differences.agency && order.agency ? "border-red-500" : "border-green-500")
                  : ""
              }
            />
            {renderDifferencesHighlight(order, orders[1 - index])}
          </div>
        ))}
      </div>
    </div>
  );
}

// Export both as default and named export
export { OrderComparison };
export default OrderComparison;