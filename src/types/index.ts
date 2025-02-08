import { DocumentType } from '@prisma/client';

export type FilterType = 'type' | 'category' | 'agency' | 'dateFrom' | 'dateTo' | 'search' | 'page' | 'limit';

export interface OrderFilters {
  type: DocumentType | '';
  category: string;
  agency: string;
  dateFrom?: string;
  dateTo?: string;
  search: string;
  page: number;
  limit: number;
  statusId?: number;
  sort?: string;
}

export interface Order {
  id: number;
  number: string;
  title: string;
  summary: string;
  type: DocumentType;
  datePublished: Date;
  category: string;
  agency: string | null;
  statusId: number;
  status: {
    id: number;
    name: string;
    color?: string;
  };
  link: string | null;
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

export interface ScrapedOrder {
  type: DocumentType;
  title: string;
  metadata: {
    orderNumber?: string;
    categories: Array<{ name: string }>;
    agencies: Array<{ name: string }>;
  };
  summary?: string;
  date: Date;
  url: string;
  categories: Array<{ name: string }>;
  agencies: Array<{ name: string }>;
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

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Type guard functions
export function isValidOrder(order: unknown): order is Order {
  if (!order || typeof order !== 'object') return false;
  
  const o = order as Order;
  return (
    typeof o.id === 'number' &&
    typeof o.number === 'string' &&
    typeof o.title === 'string' &&
    typeof o.summary === 'string' &&
    typeof o.category === 'string' &&
    (o.agency === null || typeof o.agency === 'string') &&
    typeof o.statusId === 'number' &&
    (o.link === null || typeof o.link === 'string') &&
    o.type in DocumentType &&
    o.status && typeof o.status.id === 'number' &&
    typeof o.status.name === 'string'
  );
}