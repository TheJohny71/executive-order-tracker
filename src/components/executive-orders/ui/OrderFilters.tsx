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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderFilters as OrderFiltersType, FilterType } from '@/types';

interface OrderFiltersProps {
  filters: OrderFiltersType;
  onFilterChange: (type: FilterType, value: string) => void;
  categories: string[];
  agencies: string[];
  statuses?: Array<{ id: number; name: string }>;
}

export function OrderFilters({ 
  filters, 
  onFilterChange, 
  categories, 
  agencies,
  statuses = []
}: OrderFiltersProps) {
  const handleDateSelect = (type: 'dateFrom' | 'dateTo', date: Date | undefined) => {
    onFilterChange(type, date ? format(date, 'yyyy-MM-dd') : '');
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search orders..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select
          value={filters.type || "all"}
          onValueChange={(value) => onFilterChange('type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="EXECUTIVE_ORDER">Executive Orders</SelectItem>
            <SelectItem value="MEMORANDUM">Memoranda</SelectItem>
            <SelectItem value="PROCLAMATION">Proclamations</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.category || "all"}
          onValueChange={(value) => onFilterChange('category', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.agency || "all"}
          onValueChange={(value) => onFilterChange('agency', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select agency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agencies</SelectItem>
            {agencies.map((agency) => (
              <SelectItem key={agency} value={agency}>{agency}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {statuses.length > 0 && (
          <Select
            value={filters.statusId?.toString() || "all"}
            onValueChange={(value) => onFilterChange('statusId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id.toString()}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal w-full sm:w-[240px]",
                !filters.dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateFrom ? format(new Date(filters.dateFrom), "PPP") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
              onSelect={(date) => handleDateSelect('dateFrom', date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal w-full sm:w-[240px]",
                !filters.dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateTo ? format(new Date(filters.dateTo), "PPP") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
              onSelect={(date) => handleDateSelect('dateTo', date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}