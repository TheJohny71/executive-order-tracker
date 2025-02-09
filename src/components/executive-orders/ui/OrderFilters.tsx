// src/components/executive-orders/ui/OrderFilters.tsx
import React from 'react';
import { Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentType } from '@prisma/client';
import type { OrderFilters, FilterType } from '@/types';

interface OrderFiltersProps {
  filters: OrderFilters;
  onFilterChange: (type: FilterType, value: string) => void;
  categories: string[];
  agencies: string[];
}

export function OrderFilters({
  filters,
  onFilterChange,
  categories,
  agencies,
}: OrderFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <div className="relative lg:col-span-2">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
          className="pl-10"
          placeholder="Search orders... (Press '/' to focus)"
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
      </div>
      
      <Select value={filters.type} onValueChange={(value) => onFilterChange('type', value)}>
        <SelectTrigger>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Types</SelectItem>
          <SelectItem value={DocumentType.EXECUTIVE_ORDER}>Executive Order</SelectItem>
          <SelectItem value={DocumentType.MEMORANDUM}>Memorandum</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.category} onValueChange={(value) => onFilterChange('category', value)}>
        <SelectTrigger>
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Categories</SelectItem>
          {categories.map(category => (
            <SelectItem key={category} value={category}>{category}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.agency} onValueChange={(value) => onFilterChange('agency', value)}>
        <SelectTrigger>
          <SelectValue placeholder="Agency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Agencies</SelectItem>
          {agencies.map(agency => (
            <SelectItem key={agency} value={agency}>{agency}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        value={filters.dateFrom || ''}
        onChange={(e) => onFilterChange('dateFrom', e.target.value)}
        className="w-full"
      />
    </div>
  );
}