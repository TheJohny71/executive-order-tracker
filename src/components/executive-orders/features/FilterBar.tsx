// File: src/components/executive-orders/features/FilterBar.tsx
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import type { DocumentType, OrderFilters, OrderMetadata } from '@/types';

interface FilterBarProps {
  metadata?: OrderMetadata;
  currentFilters: OrderFilters;
  isLoading?: boolean;
}

export function FilterBar({ metadata, currentFilters, isLoading }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: keyof OrderFilters, value: string) => {
    if (!searchParams) return;
    
    const newParams = new URLSearchParams(searchParams.toString());
    
    if (value && value !== 'all') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }

    // Reset page when changing filters
    if (key !== 'page') {
      newParams.delete('page');
    }

    router.push(`?${newParams.toString()}`);
  };

  const clearFilters = () => {
    router.push('');
  };

  const hasActiveFilters = 
    currentFilters.type !== 'all' ||
    currentFilters.category !== '' ||
    currentFilters.agency !== '' ||
    currentFilters.statusId !== undefined ||
    currentFilters.search !== '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {/* Document Type Filter */}
        <Select
          value={currentFilters.type}
          onValueChange={(value: DocumentType | 'all') => updateFilter('type', value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Document Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="EXECUTIVE_ORDER">Executive Order</SelectItem>
              <SelectItem value="PROCLAMATION">Proclamation</SelectItem>
              <SelectItem value="DETERMINATION">Determination</SelectItem>
              <SelectItem value="MEMORANDUM">Memorandum</SelectItem>
              <SelectItem value="NOTICE">Notice</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={currentFilters.category}
          onValueChange={(value) => updateFilter('category', value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All Categories</SelectItem>
              {metadata?.categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Agency Filter */}
        <Select
          value={currentFilters.agency}
          onValueChange={(value) => updateFilter('agency', value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Agency" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All Agencies</SelectItem>
              {metadata?.agencies.map((agency) => (
                <SelectItem key={agency} value={agency}>
                  {agency}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={currentFilters.statusId?.toString() || ''}
          onValueChange={(value) => updateFilter('statusId', value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All Statuses</SelectItem>
              {metadata?.statuses.map((status) => (
                <SelectItem key={status.id} value={status.id.toString()}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={currentFilters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-8"
            disabled={isLoading}
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}