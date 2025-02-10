// src/lib/api/types.ts
import { DocumentType } from '@prisma/client';

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Order {
  id: number;
  number: string;
  title: string;
  summary: string;
  link: string | null;
  type: DocumentType;
  category: string;
  agency: string | null;
  statusId: number;
  date: Date;
  status: {
    id: number;
    name: string;
  };
}

export interface OrdersResponse {
  orders: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  metadata: {
    categories: string[];
    agencies: string[];
    statuses: Array<{
      id: number;
      name: string;
    }>;
  };
}

export interface OrdersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: DocumentType;
  category?: string;
  agency?: string;
  statusId?: number;
  sort?: string;
  dateFrom?: string;
  dateTo?: string;
}