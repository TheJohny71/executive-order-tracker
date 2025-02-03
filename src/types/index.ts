// src/types/index.ts
export interface Order {
  id: number;
  orderNumber?: string;
  type: string;
  title: string;
  date: string;
  summary?: string;
  notes?: string;
  url: string;
  isNew: boolean;
  categories: { name: string }[];
  agencies: { name: string }[];
}

export interface OrdersResponse {
  orders: Order[];
  metadata: {
    categories: string[];
    agencies: string[];
  };
  filteredCount: number;
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    limit: number;
  };
}

export type FilterType = keyof OrderFilters;

export interface OrderFilters {
  type: string;
  category: string;
  agency: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
}