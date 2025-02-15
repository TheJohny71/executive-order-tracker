// File: src/components/executive-orders/ui/OrderCard.tsx
import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Link, 
  GitCompare,
  Bookmark,
  MessageSquare 
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
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
  onSelect?: (order: Order) => void;
  className?: string;
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const getBadgeVariant = (status: string): BadgeVariant => {
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

export function OrderCard({
  order,
  isSelectable = false,
  onSelect,
  className = ''
}: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={`transition-all duration-200 ${className}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {order.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Published {new Date(order.datePublished).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={getBadgeVariant(order.status.name)}>
                  {order.status.name}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-4 pb-2">
            <div className="space-y-4">
              {/* Summary */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">
                  Summary
                </h4>
                <p className="text-gray-700">{order.summary}</p>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                {/* Agency */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Agency
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {order.agency || 'N/A'}
                    </Badge>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Category
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {order.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Comment
                </Button>
                {isSelectable && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.(order);
                    }}
                  >
                    <GitCompare className="h-4 w-4 mr-2" />
                    Compare
                  </Button>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                {order.link && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(order.link, '_blank');
                    }}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Source
                  </Button>
                )}
              </div>
            </div>
          </CardFooter>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}