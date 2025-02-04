import React from 'react';
import { 
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown } from 'lucide-react';
import type { Order, FilterType } from '@/types';

interface OrderCardProps {
  order: Order;
  isComparing: boolean;
  compareItems: Order[];
  onCompareToggle: (order: Order) => void;
  onRecentlyViewed: (order: Order) => void;
  onFilterChange: (filterType: FilterType, value: string) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  isComparing,
  compareItems,
  onCompareToggle,
  onRecentlyViewed,
  onFilterChange,
}) => {
  const handleCategoryClick = (category: string) => {
    onFilterChange('category', category);
  };

  const handleAgencyClick = (agency: string) => {
    onFilterChange('agency', agency);
  };

  return (
    <Card 
      key={order.id}
      id={`order-${order.id}`} 
      className={`transform transition-all duration-200 hover:shadow-lg
        border-l-4 ${order.categories[0]?.name.toLowerCase() || ''}`}
    >
      <Collapsible>
        <CardHeader className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={order.type === 'Executive Order' ? 'default' : 'secondary'}>
                  {order.type}
                </Badge>
                {order.orderNumber && (
                  <Badge variant="outline">#{order.orderNumber}</Badge>
                )}
                {order.isNew && (
                  <Badge variant="destructive">New</Badge>
                )}
                <span className="text-sm text-gray-500">
                  {new Date(order.date).toLocaleDateString()}
                </span>
              </div>
              <CollapsibleTrigger 
                className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                onClick={() => onRecentlyViewed(order)}
              >
                <h3 className="text-xl font-semibold">{order.title}</h3>
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
            </div>
            {isComparing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCompareToggle(order)}
              >
                {compareItems.find(o => o.id === order.id) ? 'Remove' : 'Compare'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="px-6 pb-6 pt-0">
            <div className="flex justify-between items-start">
              <div className="space-y-4 flex-1">
                <div>
                  <h3 className="font-medium text-gray-900">Summary</h3>
                  <p className="mt-1 text-gray-600">{order.summary}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Categories</h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {order.categories.map((category) => (
                      <Badge 
                        key={category.name} 
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleCategoryClick(category.name)}
                      >
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Key Agencies</h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {order.agencies.map((agency) => (
                      <Badge 
                        key={agency.name} 
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleAgencyClick(agency.name)}
                      >
                        {agency.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                {order.notes && (
                  <div>
                    <h3 className="font-medium text-gray-900">Notes</h3>
                    <p className="mt-1 text-gray-600">{order.notes}</p>
                  </div>
                )}
              </div>
              <div className="ml-6 flex flex-col items-end">
                <a
                  href={order.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  View on whitehouse.gov
                </a>
                <span className="text-sm text-gray-500 mt-2">Official Source</span>
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Add any additional action handlers here
                      console.log('Download PDF clicked');
                    }}
                  >
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};