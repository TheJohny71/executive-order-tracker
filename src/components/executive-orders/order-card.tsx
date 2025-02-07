import React from 'react';
import { 
  Card as CardComponent,
  CardContent as CardContentComponent,
  CardHeader as CardHeaderComponent,
} from "@/components/ui/card";
import {
  Collapsible as CollapsibleComponent,
  CollapsibleContent as CollapsibleContentComponent,
  CollapsibleTrigger as CollapsibleTriggerComponent,
} from "@/components/ui/collapsible";
import { Badge as BadgeComponent } from "@/components/ui/badge";
import { Button as ButtonComponent } from "@/components/ui/button";
import { ChevronDown } from 'lucide-react';
import type { Order, FilterType } from '@/types';

// Rename components to match imports
const Card = CardComponent;
const CardContent = CardContentComponent;
const CardHeader = CardHeaderComponent;
const Collapsible = CollapsibleComponent;
const CollapsibleContent = CollapsibleContentComponent;
const CollapsibleTrigger = CollapsibleTriggerComponent;
const Badge = BadgeComponent;
const Button = ButtonComponent;

interface OrderCardProps {
  order: Order;
  isComparing: boolean;
  compareItems: Order[];
  onCompareToggle: (order: Order) => void;
  onRecentlyViewed: (order: Order) => void;
  onFilterChange: (filterType: FilterType, value: string) => void;
  onPdfDownload?: (order: Order) => Promise<void>;
}

const getStatusColor = (statusName: string) => {
  switch (statusName.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'revoked':
      return 'bg-red-100 text-red-800';
    case 'superseded':
      return 'bg-yellow-100 text-yellow-800';
    case 'amended':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  isComparing,
  compareItems,
  onCompareToggle,
  onRecentlyViewed,
  onFilterChange,
  onPdfDownload
}) => {
  const handleCategoryClick = (category: string | null) => {
    if (category) {
      onFilterChange('category', category);
    }
  };

  const handleAgencyClick = (agency: string | null) => {
    if (agency) {
      onFilterChange('agency', agency);
    }
  };

  const handleDownloadPDF = async () => {
    if (onPdfDownload) {
      await onPdfDownload(order);
    }
  };

  // Use optional chaining for status name
  const statusName = order.status?.name;

  return (
    <Card 
      key={order.id}
      id={`order-${order.id}`} 
      className={`transform transition-all duration-200 hover:shadow-lg
        border-l-4 ${order.category?.toLowerCase() || ''}`}
    >
      <Collapsible>
        <CardHeader className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={order.type === 'EXECUTIVE_ORDER' ? 'default' : 'secondary'}>
                  {order.type === 'EXECUTIVE_ORDER' ? 'Executive Order' : 'Memorandum'}
                </Badge>
                <Badge variant="outline">#{order.number}</Badge>
                {statusName && (
                  <Badge className={getStatusColor(statusName)}>
                    {statusName}
                  </Badge>
                )}
                <span className="text-sm text-gray-500">
                  {new Date(order.datePublished).toLocaleDateString()}
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
                {order.summary && (
                  <div>
                    <h3 className="font-medium text-gray-900">Summary</h3>
                    <p className="mt-1 text-gray-600">{order.summary}</p>
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-gray-900">Category</h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {order.category && (
                      <Badge 
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleCategoryClick(order.category)}
                      >
                        {order.category}
                      </Badge>
                    )}
                  </div>
                </div>
                {order.agency && (
                  <div>
                    <h3 className="font-medium text-gray-900">Agency</h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge 
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleAgencyClick(order.agency)}
                      >
                        {order.agency}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
              <div className="ml-6 flex flex-col items-end">
                {order.link && (
                  <a
                    href={order.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    View on whitehouse.gov
                  </a>
                )}
                {onPdfDownload && order.link && (
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDownloadPDF}
                    >
                      Download PDF
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};