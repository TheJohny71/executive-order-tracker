import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Order } from '@/types';

interface ComparisonViewProps {
  items: Order[];
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ items }) => {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Comparing {items.length} Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(order => (
            <div key={order.id} className="space-y-4">
              <h3 className="font-medium">{order.title}</h3>
              <div className="text-sm space-y-2">
                <p><strong>Type:</strong> {order.type}</p>
                <p><strong>Date:</strong> {new Date(order.date).toLocaleDateString()}</p>
                <p><strong>Categories:</strong> {order.categories.map(c => c.name).join(', ')}</p>
                <p><strong>Agencies:</strong> {order.agencies.map(a => a.name).join(', ')}</p>
              </div>
              <p className="text-sm text-gray-600">{order.summary}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};