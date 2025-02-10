import { DocumentType } from '@prisma/client';

// Filter Types
export type FilterType = 'type' | 'category' | 'agency' | 'dateFrom' | 'dateTo' | 'search' | 'page' | 'limit' | 'statusId' | 'sort';
export type SelectableValue = string | number | null;

// Order Interfaces
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

export interface OrderFilters {
  type: DocumentType | 'all' | '';
  category: string;
  agency: string;
  dateFrom?: string;
  dateTo?: string;
  search: string;
  page: number;
  limit: number;
  statusId?: number;
  sort?: 'asc' | 'desc' | string;
}

// Metadata and Status Interfaces
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

// Pagination Interfaces
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

// Scraper Related Interfaces
export interface ScrapedOrder {
  identifier: string;
  type: DocumentType;
  title: string;
  date: Date;
  url: string;
  summary: string;
  content: string | null;
  notes: string | null;
  statusId: string;
  isNew: boolean;
  categories: Array<{ name: string }>;
  agencies: Array<{ name: string }>;
  metadata?: {
    orderNumber?: string;
    categories?: Array<{ name: string }>;
    agencies?: Array<{ name: string }>;
  };
}

// Query Related Types
export interface WhereClause {
  type?: DocumentType;
  statusId?: number;
  identifier?: string;
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
}

export interface OrderByClause {
  [key: string]: 'asc' | 'desc';
}

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Database Input Types
export interface OrderCreateInput {
  identifier: string;
  type: DocumentType;
  title: string;
  date: Date;
  url: string;
  summary: string;
  content?: string | null;
  notes?: string | null;
  statusId: string;
  isNew: boolean;
  categories?: {
    connectOrCreate: Array<{
      where: { name: string };
      create: { name: string };
    }>;
  };
  agencies?: {
    connectOrCreate: Array<{
      where: { name: string };
      create: { name: string };
    }>;
  };
}

export interface OrderWhereInput {
  identifier?: string;
  type?: DocumentType;
  title?: string;
  date?: Date;
  url?: string;
  summary?: string;
  content?: string | null;
  notes?: string | null;
  statusId?: string;
  isNew?: boolean;
  OR?: OrderWhereInput[];
  AND?: OrderWhereInput[];
  categories?: {
    some: {
      name: string;
    };
  };
  agencies?: {
    some: {
      name: string;
    };
  };
}

// Type Guards and Utility Functions
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

export function getSelectValue(value: string | null | undefined): string {
  return value || 'all';
}

export type { DocumentType };