import { Prisma, DocumentType } from '@prisma/client';

export { DocumentType };

export interface Status {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Agency {
  id: number;
  name: string;
}

export interface Order {
  id: number;
  type: DocumentType;
  number: string;
  title: string;
  summary: string;
  datePublished: Date | string;
  category: string;          // Changed to string to match schema
  agency: string | null;     // Changed to string to match schema
  statusId: number;
  link: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  status: Status;           // Only including status relation as it exists in schema
}

export type FilterType = 
  | 'type'
  | 'category'
  | 'agency'
  | 'search'
  | 'dateFrom'
  | 'dateTo'
  | 'page'
  | 'limit'
  | 'statusId'
  | 'sort';

export interface OrderFilters {
  type: DocumentType | '';
  category: string;
  agency: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
  statusId?: number;
  sort?: 'datePublished' | 'title' | 'type' | '-datePublished' | '-title' | '-type';
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
    statuses: { id: number; name: string }[];
  };
}

// Updated to match actual schema structure
export type WhereClause = {
  type?: DocumentType;
  number?: string | { contains: string; mode: 'insensitive' };
  title?: string | { contains: string; mode: 'insensitive' };
  summary?: string | { contains: string; mode: 'insensitive' };
  datePublished?: { gte?: Date; lte?: Date };
  category?: string | { equals: string; mode: 'insensitive' };
  agency?: string | { equals: string; mode: 'insensitive' };
  statusId?: number;
  link?: string;
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' };
    summary?: { contains: string; mode: 'insensitive' };
    number?: { contains: string; mode: 'insensitive' };
  }>;
};

// Updated to match actual schema structure
export type OrderByClause = {
  id?: 'asc' | 'desc';
  type?: 'asc' | 'desc';
  number?: 'asc' | 'desc';
  title?: 'asc' | 'desc';
  summary?: 'asc' | 'desc';
  datePublished?: 'asc' | 'desc';
  category?: 'asc' | 'desc';
  agency?: 'asc' | 'desc';
  statusId?: 'asc' | 'desc';
  link?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
};

export interface UseOrdersReturn {
  data: OrdersResponse | null;
  error: string | null;
  loading: boolean;
  lastUpdate?: Date;
  refresh: () => Promise<void>;
}