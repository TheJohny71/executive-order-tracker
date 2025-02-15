// File: src/components/executive-orders/features/AdvancedFiltersSheet.tsx
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import type { OrderFilters, OrderMetadata } from '@/types';

interface AdvancedFiltersSheetProps {
  filters: OrderFilters;
  metadata: OrderMetadata;
  onFilterChange: (type: keyof OrderFilters, value: string) => void;
  onClearFilters: () => void;
  className?: string;
}

export function AdvancedFiltersSheet({
  filters,
  metadata,
  onFilterChange,
  onClearFilters,
  className = ''
}: AdvancedFiltersSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className={`w-full ${className}`}>
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Advanced Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Document Properties */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Document Properties</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={filters.type}
                onValueChange={(value) => onFilterChange('type', value)}
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
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Date Range</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => onFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Categories and Agencies */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Categories & Agencies</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={filters.category}
                onValueChange={(value) => onFilterChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {metadata.categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
            </div>
          </div>

          {/* Sort Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Sort Options</h3>
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
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-6">
            <Button 
              variant="outline" 
              onClick={onClearFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
            <Button>
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}