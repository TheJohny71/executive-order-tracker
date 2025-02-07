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
  const handleCategoryClick = (category: string) => {
    onFilterChange('category', category);
  };

  const handleAgencyClick = (agency: string) => {
    onFilterChange('agency', agency);
  };

  const handleDownloadPDF = async () => {
    if (onPdfDownload) {
      await onPdfDownload(order);
    }
  };

  const mainCategory = order.categories[0]?.name.toLowerCase() || '';

  return (
    <Card 
      key={order.id}
      id={`order-${order.id}`} 
      className={`transform transition-all duration-200 hover:shadow-lg
        border-l-4 ${mainCategory}`}
    >
      <Collapsible>
        <CardHeader className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={order.type === 'EXECUTIVE_ORDER' ? 'default' : 'secondary'}>
                  {order.type === 'EXECUTIVE_ORDER' ? 'Executive Order' : 'Memorandum'}
                </Badge>
                <Badge variant="outline">#{order.identifier}</Badge>
                <Badge className={getStatusColor(order.status.name)}>
                  {order.status.name}
                </Badge>
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
                {order.summary && (
                  <div>
                    <h3 className="font-medium text-gray-900">Summary</h3>
                    <p className="mt-1 text-gray-600">{order.summary}</p>
                  </div>
                )}
                {order.content && (
                  <div>
                    <h3 className="font-medium text-gray-900">Full Content</h3>
                    <div className="mt-1 max-h-48 overflow-y-auto text-gray-600">
                      {order.content}
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-gray-900">Categories</h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {order.categories.map((category) => (
                      <Badge 
                        key={category.id} 
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleCategoryClick(category.name)}
                      >
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                {order.agencies.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900">Key Agencies</h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {order.agencies.map((agency) => (
                        <Badge 
                          key={agency.id} 
                          variant="outline"
                          className="cursor-pointer hover:bg-gray-100"
                          onClick={() => handleAgencyClick(agency.name)}
                        >
                          {agency.abbreviation || agency.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {order.notes && (
                  <div>
                    <h3 className="font-medium text-gray-900">Notes</h3>
                    <p className="mt-1 text-gray-600">{order.notes}</p>
                  </div>
                )}
                {order.amendments.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900">Amendments</h3>
                    <div className="mt-1 space-y-2">
                      {order.amendments.map((amendment) => (
                        <div key={amendment.id} className="text-sm text-gray-600">
                          <div className="font-medium">
                            {new Date(amendment.dateAmended).toLocaleDateString()}
                          </div>
                          <p>{amendment.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {order.citations.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900">Citations</h3>
                    <div className="mt-1 space-y-2">
                      {order.citations.map((citation) => (
                        <div key={citation.id} className="text-sm text-gray-600">
                          {citation.description}
                        </div>
                      ))}
                    </div>
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
                {onPdfDownload && (
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