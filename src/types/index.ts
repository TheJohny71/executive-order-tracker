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

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ScrapedOrder {
  number: string;
  type: DocumentType;
  title: string;
  summary: string;
  datePublished: Date;
  category: string;
  agency: string | null;
  link: string | null;
  statusId: number;
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

export function isValidCategory(category: unknown): category is Category {
  if (!category || typeof category !== 'object') return false;
  
  const c = category as Category;
  return (
    typeof c.id === 'number' &&
    typeof c.name === 'string'
  );
}

export function isValidAgency(agency: unknown): agency is Agency {
  if (!agency || typeof agency !== 'object') return false;
  
  const a = agency as Agency;
  return (
    typeof a.id === 'number' &&
    typeof a.name === 'string'
  );
}

export type CreateOrderInput = Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
  statusId: number;
};

export type UpdateOrderInput = Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>;