// File: src/components/executive-orders/ui/OrderCard.tsx
import React from 'react';
import { 
  MessageSquare, 
  Bookmark, 
  ChevronDown,
  GitCompare,
  Download,
  ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { Order } from '@/types';

interface OrderCardProps {
  order: Order;
  isSelectable?: boolean;
  onSelect?: () => void;
  isComparing?: boolean;
  viewMode?: 'standard' | 'focus';
}

export function OrderCard({ 
  order, 
  isSelectable, 
  onSelect,
  isComparing,
  viewMode = 'standard'
}: OrderCardProps) {
  const borderColor = order.type === 'EXECUTIVE_ORDER' ? 'border-l-blue-500' : 'border-l-purple-500';
  const orderDate = new Date(order.datePublished);
  
  return (
    <Collapsible>
      <Card className={`border-l-4 ${borderColor} hover:shadow-md transition-shadow`}>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{order.type.replace('_', ' ')}</Badge>
                  {order.number && (
                    <Badge variant="outline">#{order.number}</Badge>
                  )}
                  <span className="text-sm text-gray-500">
                    {orderDate.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{order.title}</h3>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
                {viewMode === 'focus' && order.summary && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {order.summary}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm">
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4">
            <div className="space-y-4">
              {order.summary && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                  <p className="text-gray-600">{order.summary}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Agencies</h4>
                  <div className="flex flex-wrap gap-2">
                    {order.agencies?.map((agency, index) => (
                      <Badge key={index} variant="outline">{agency.name}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {order.categories?.map((category, index) => (
                      <Badge key={index} variant="secondary">{category.name}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <div className="flex items-center gap-2">
                  {isSelectable && (
                    <Button 
                      variant={isComparing ? "default" : "outline"} 
                      size="sm" 
                      onClick={onSelect}
                    >
                      <GitCompare className="h-4 w-4 mr-2" />
                      {isComparing ? 'Selected' : 'Compare'}
                    </Button>
                  )}
                  {order.link && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  )}
                </div>

                {order.link && (
                  <a
                    href={order.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View on whitehouse.gov
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}