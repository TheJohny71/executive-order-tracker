// File: src/components/executive-orders/layouts/TrackerSidebar.tsx
// Description: Sidebar component with filters and tools

import React from 'react';
import { History, GitCompare, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderFilters } from '../ui/OrderFilters';
import type { OrderFilters as OrderFiltersType } from '@/types';

interface TrackerSidebarProps {
  filters: OrderFiltersType;
  onFilterChange: (type: string, value: string) => void;
  categories: string[];
  agencies: string[];
  statuses: Array<{ id: number; name: string }>;
  onExport: () => void;
  onCompare: () => void;
  className?: string;
}

export function TrackerSidebar({
  filters,
  onFilterChange,
  categories,
  agencies,
  statuses,
  onExport,
  onCompare,
  className = ''
}: TrackerSidebarProps) {
  return (
    <aside className={`hidden lg:block w-64 space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderFilters
            filters={filters}
            onFilterChange={onFilterChange}
            categories={categories}
            agencies={agencies}
            statuses={statuses}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="ghost" className="w-full justify-start">
            <History className="h-4 w-4 mr-2" />
            Version History
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start"
            onClick={onCompare}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Compare Orders
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start"
            onClick={onExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}