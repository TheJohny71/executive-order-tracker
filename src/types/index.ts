import { DocumentType } from '@prisma/client';

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
  category: string;
  agency: string | null;
  statusId: number;
  link: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  status: Status;
}

export interface ScrapedOrder {
  identifier: string;
  type: DocumentType;
  title: string;
  date: Date;
  url: string;
  pdfUrl: string;
  summary: string | null;
  notes: string | null;
  content: string | null;
  statusId: string;
  categories: { name: string }[];
  agencies: { name: string }[];
  isNew: boolean;
  metadata: {
    orderNumber: string | null;
    citations: Array<{
      id: string;
      description: string;
    }>;
    amendments: Array<{
      id: string;
      dateAmended: Date;
      description: string;
    }>;
  };
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