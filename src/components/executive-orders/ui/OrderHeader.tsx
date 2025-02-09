// src/components/executive-orders/ui/OrderHeader.tsx
import React from 'react';
import { List, Grid, BarChart2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface OrderHeaderProps {
  viewMode: 'expanded' | 'compact';
  showTimeline: boolean;
  isComparing: boolean;
  onViewModeChange: (mode: 'expanded' | 'compact') => void;
  onTimelineToggle: () => void;
  onCompareToggle: () => void;
  totalOrders?: number;
  lastUpdate?: string;
}

export function OrderHeader({
  viewMode,
  showTimeline,
  isComparing,
  onViewModeChange,
  onTimelineToggle,
  onCompareToggle,
  totalOrders = 0,
  lastUpdate,
}: OrderHeaderProps) {
  return (
    <div className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Executive Order Tracker</h1>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              {lastUpdate && <span>Last Updated: {new Date(lastUpdate).toLocaleDateString()}</span>}
              <span className="mx-2">•</span>
              <span>{totalOrders} orders found</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'expanded' ? 'default' : 'outline'}
              onClick={() => onViewModeChange(viewMode === 'expanded' ? 'compact' : 'expanded')}
            >
              {viewMode === 'expanded' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button 
              variant={showTimeline ? 'default' : 'outline'}
              onClick={onTimelineToggle}
            >
              <BarChart2 className="h-4 w-4" />
            </Button>
            <Button 
              variant={isComparing ? 'default' : 'outline'}
              className="md:flex hidden"
              onClick={onCompareToggle}
            >
              Compare
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}