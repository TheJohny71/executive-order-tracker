// src/types/index.ts

// Import Prisma types
import { Prisma } from '@prisma/client';

// Use enum from Prisma schema
export enum DocumentType {
  EXECUTIVE_ORDER = 'EXECUTIVE_ORDER',
  MEMORANDUM = 'MEMORANDUM'
}

export interface OrderFilters {
  type: DocumentType | '';
  category: string;
  agency: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
  statusId?: string;
  sort?: 'date' | 'title' | 'type' | '-date' | '-title' | '-type';
}

export interface Status {
  id: string;
  name: string;
  description: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
}

export interface Agency {
  id: string;
  name: string;
  abbreviation: string | null;
  description: string | null;
}

export interface Citation {
  id: string;
  sourceId: string;
  targetId: string;
  description: string | null;
}

export interface Amendment {
  id: string;
  orderId: string;
  amendedText: string;
  description: string | null;
  dateAmended: string;
}

export interface Order {
  id: string;
  identifier: string;
  type: DocumentType;
  title: string;
  date: string;
  url: string;
  summary: string | null;
  notes: string | null;
  content: string | null;
  statusId: string;
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
  status: Status;
  categories: Category[];
  agencies: Agency[];
  citations: Citation[];
  amendments: Amendment[];
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
    statuses: { id: string; name: string }[];
  };
}

export interface UseOrdersReturn {
  data: OrdersResponse | null;
  error: string | null;
  loading: boolean;
  lastUpdate?: Date;
  refresh: () => Promise<void>;
}

// Type guards
export function isValidOrder(order: unknown): order is Order {
  if (!order || typeof order !== 'object') return false;
  
  const o = order as Order;
  return (
    typeof o.id === 'string' &&
    typeof o.identifier === 'string' &&
    typeof o.title === 'string' &&
    typeof o.date === 'string' &&
    typeof o.url === 'string' &&
    typeof o.statusId === 'string' &&
    Array.isArray(o.categories) &&
    Array.isArray(o.agencies) &&
    o.type in DocumentType &&
    o.categories.every(isValidCategory) &&
    o.agencies.every(isValidAgency)
  );
}

export function isValidCategory(category: unknown): category is Category {
  if (!category || typeof category !== 'object') return false;
  
  const c = category as Category;
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    (c.description === null || typeof c.description === 'string')
  );
}

export function isValidAgency(agency: unknown): agency is Agency {
  if (!agency || typeof agency !== 'object') return false;
  
  const a = agency as Agency;
  return (
    typeof a.id === 'string' &&
    typeof a.name === 'string' &&
    (a.abbreviation === null || typeof a.abbreviation === 'string') &&
    (a.description === null || typeof a.description === 'string')
  );
}

// Prisma-specific types
export type WhereClause = Prisma.ExecutiveOrderWhereInput;
export type OrderByClause = Prisma.ExecutiveOrderOrderByWithRelationInput;

// Scraper types
export interface ScrapedOrder {
  identifier: string;
  type: DocumentType;
  title: string;
  date: Date;
  url: string;
  summary: string | null;
  notes: string | null;
  content?: string | null;
  statusId: string;
  categories: { name: string }[];
  agencies: { name: string }[];
  isNew: boolean;
}

export interface TimelineData {
  month: string;
  count: number;
  byType?: Record<DocumentType, number>;
}

// Helper types for operations
export type PartialOrder = Partial<Order>;
export type CreateOrderInput = Omit<Order, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateOrderInput = Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>;