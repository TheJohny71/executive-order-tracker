import React from 'react';
import { X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order } from '@/types';

interface ComparisonViewProps {
  orders: [Order, Order]; // Exactly two orders
  onClose: () => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ orders, onClose }) => {
  const [order1, order2] = orders;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const compareField = (
    label: string,
    value1: React.ReactNode,
    value2: React.ReactNode,
    isDifferent?: boolean
  ) => {
    const bgClass = isDifferent ? 'bg-yellow-50' : 'bg-gray-50';
    return (
      <div className="mb-4">
        <h3 className="font-medium text-gray-900 mb-2">{label}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 ${bgClass} rounded`}>
            {value1}
          </div>
          <div className={`p-3 ${bgClass} rounded`}>
            {value2}
          </div>
        </div>
      </div>
    );
  };

  const compareAgencies = (agencies1: Order['agencies'], agencies2: Order['agencies']) => {
    const isDifferent = JSON.stringify(agencies1.map(a => a.name).sort()) !== 
                       JSON.stringify(agencies2.map(a => a.name).sort());
    return compareField(
      'Agencies',
      <div className="flex flex-wrap gap-1">
        {agencies1.map(agency => (
          <Badge key={agency.id} variant="outline">{agency.name}</Badge>
        ))}
      </div>,
      <div className="flex flex-wrap gap-1">
        {agencies2.map(agency => (
          <Badge key={agency.id} variant="outline">{agency.name}</Badge>
        ))}
      </div>,
      isDifferent
    );
  };

  const compareCategories = (categories1: Order['categories'], categories2: Order['categories']) => {
    const isDifferent = JSON.stringify(categories1.map(c => c.name).sort()) !== 
                       JSON.stringify(categories2.map(c => c.name).sort());
    return compareField(
      'Categories',
      <div className="flex flex-wrap gap-1">
        {categories1.map(category => (
          <Badge key={category.id} variant="secondary">{category.name}</Badge>
        ))}
      </div>,
      <div className="flex flex-wrap gap-1">
        {categories2.map(category => (
          <Badge key={category.id} variant="secondary">{category.name}</Badge>
        ))}
      </div>,
      isDifferent
    );
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Order Comparison</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {compareField(
          'Order Number',
          order1.number || 'N/A',
          order2.number || 'N/A',
          order1.number !== order2.number
        )}
        
        {compareField(
          'Title',
          order1.title,
          order2.title,
          order1.title !== order2.title
        )}

        {compareField(
          'Type',
          <Badge>{order1.type.replace('_', ' ')}</Badge>,
          <Badge>{order2.type.replace('_', ' ')}</Badge>,
          order1.type !== order2.type
        )}

        {compareField(
          'Date Published',
          formatDate(order1.datePublished),
          formatDate(order2.datePublished),
          order1.datePublished.getTime() !== order2.datePublished.getTime()
        )}

        {compareField(
          'Status',
          <Badge variant="outline" style={{ 
            backgroundColor: order1.status.color || undefined 
          }}>
            {order1.status.name}
          </Badge>,
          <Badge variant="outline" style={{ 
            backgroundColor: order2.status.color || undefined 
          }}>
            {order2.status.name}
          </Badge>,
          order1.status.name !== order2.status.name
        )}

        {compareAgencies(order1.agencies, order2.agencies)}
        {compareCategories(order1.categories, order2.categories)}

        {compareField(
          'Summary',
          order1.summary || 'No summary available',
          order2.summary || 'No summary available',
          order1.summary !== order2.summary
        )}

        <div className="mt-6 pt-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Highlighted sections indicate differences
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button variant="default" size="sm">
              Export Comparison
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};