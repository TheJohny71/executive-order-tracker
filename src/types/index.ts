import { DocumentType } from '@prisma/client';

export interface OrderFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  agency?: string;
  status?: string;
  search?: string;
  type?: DocumentType;
}

export interface Order {
  id: number;
  number: string;
  title: string;
  summary: string;
  type: DocumentType;
  datePublished: Date;
  category: string;
  agency?: string;
  statusId: number;
  status: {
    id: number;
    name: string;
    color?: string;
  };
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderMetadata {
  categories: string[];
  agencies: string[];
  statuses: OrderStatus[];
}

export interface OrderStatus {
  id: number;
  name: string;
  color?: string;
}

export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface OrdersResponse {
  orders: Order[];
  metadata: OrderMetadata;
  pagination: PaginationData;
}

export interface Category {
  id: number;
  name: string;
}

export interface Agency {
  id: number;
  name: string;
}

export type WhereClause = {
  type?: DocumentType;
  statusId?: number;
  category?: {
    equals: string;
    mode: 'insensitive';
  };
  agency?: {
    equals: string;
    mode: 'insensitive';
  };
  datePublished?: {
    gte?: Date;
    lte?: Date;
  };
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' };
    summary?: { contains: string; mode: 'insensitive' };
    number?: { contains: string; mode: 'insensitive' };
  }>;
};

export type OrderByClause = {
  [key: string]: 'asc' | 'desc';
};