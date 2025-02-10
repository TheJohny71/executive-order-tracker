import React from 'react';
import type { Order } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ComparisonViewProps {
  orders: [Order, Order]; // Exactly two orders
  onClose: () => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ orders, onClose }) => {
  const [order1, order2] = orders;

  const compareField = (field: keyof Order, label: string) => {
    return (
      <div className="mb-4">
        <h3 className="font-medium text-gray-900 mb-2">{label}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded">
            {String(order1[field])}
          </div>
          <div className="p-3 bg-gray-50 rounded">
            {String(order2[field])}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Order Comparison</span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {compareField('number', 'Order Number')}
        {compareField('title', 'Title')}
        {compareField('datePublished', 'Date Published')}
        {compareField('category', 'Category')}
        {compareField('agency', 'Agency')}
        {compareField('summary', 'Summary')}
        {compareField('status', 'Status')}
        {compareField('link', 'Link')}
        {compareField('createdAt', 'Created At')}
        {compareField('updatedAt', 'Updated At')}
      </CardContent>
    </Card>
  );
};
