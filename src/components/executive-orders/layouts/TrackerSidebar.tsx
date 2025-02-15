// File: src/components/executive-orders/layouts/TrackerSidebar.tsx
import React from 'react';
import { History, GitCompare, Download, Filter, Calendar, ChevronDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DocumentType, OrderFilters, OrderMetadata } from '@/types';

interface TrackerSidebarProps {
  filters: OrderFilters;
  metadata: OrderMetadata;
  onFilterChange: (type: keyof OrderFilters, value: string) => void;
  onExport: () => void;
  onCompare: () => void;
  onClearFilters: () => void;
  activeOrderCount?: number;
  pendingReviewCount?: number;
  thisMonthCount?: number;
  className?: string;
}

export function TrackerSidebar({
  filters,
  metadata,
  onFilterChange,
  onExport,
  onCompare,
  onClearFilters,
  activeOrderCount = 0,
  pendingReviewCount = 0,
  thisMonthCount = 0,
  className = ''
}: TrackerSidebarProps) {
  return (
    <aside className={`hidden lg:block w-64 space-y-6 ${className}`}>
      {/* Quick Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Filters
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilters}
              className="h-8 px-2 text-muted-foreground"
            >
              Clear
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document Type */}
          <Select
            value={filters.type}
            onValueChange={(value) => onFilterChange('type', value as DocumentType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="EXECUTIVE_ORDER">Executive Order</SelectItem>
              <SelectItem value="PROCLAMATION">Proclamation</SelectItem>
              <SelectItem value="MEMORANDUM">Memorandum</SelectItem>
            </SelectContent>
          </Select>

          {/* Practice Area (Category) */}
          <Select
            value={filters.category}
            onValueChange={(value) => onFilterChange('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Practice Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Areas</SelectItem>
              {metadata.categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Agency */}
          <Select
            value={filters.agency}
            onValueChange={(value) => onFilterChange('agency', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Agency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Agencies</SelectItem>
              {metadata.agencies.map((agency) => (
                <SelectItem key={agency} value={agency}>
                  {agency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status */}
          <Select
            value={filters.statusId?.toString() || ''}
            onValueChange={(value) => onFilterChange('statusId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              {metadata.statuses.map((status) => (
                <SelectItem key={status.id} value={status.id.toString()}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Date Range</label>
            <div className="grid gap-2">
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                placeholder="From"
              />
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFilterChange('dateTo', e.target.value)}
                placeholder="To"
              />
            </div>
          </div>

          {/* Sort Options */}
          <Select
            value={filters.sort}
            onValueChange={(value) => onFilterChange('sort', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest First</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="type">Document Type</SelectItem>
            </SelectContent>
          </Select>

          {/* Quick Views */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Quick Views</label>
            <ScrollArea className="h-[120px]">
              <div className="space-y-1">
                <Button variant="ghost" className="w-full justify-start" onClick={() => onFilterChange('statusId', '1')}>
                  <Badge variant="default" className="mr-2">{activeOrderCount}</Badge>
                  Active Orders
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => onFilterChange('statusId', '2')}>
                  <Badge variant="secondary" className="mr-2">{pendingReviewCount}</Badge>
                  Pending Review
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  onFilterChange('dateFrom', firstDay.toISOString().split('T')[0]);
                }}>
                  <Badge variant="outline" className="mr-2">{thisMonthCount}</Badge>
                  This Month
                </Button>
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Tools Card */}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <DropdownMenuItem onClick={() => onExport()}>
                Current View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport()}>
                Selected Orders
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport()}>
                All Orders
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Orders</span>
              <span className="font-medium">{activeOrderCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">This Month</span>
              <span className="font-medium">{thisMonthCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending Review</span>
              <span className="font-medium">{pendingReviewCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}