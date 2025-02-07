import { Prisma, DocumentType as PrismaDocumentType } from '@prisma/client';

// Document Types
export type DocumentType = PrismaDocumentType;

export const OrderTypes = {
  EXECUTIVE_ORDER: PrismaDocumentType.EXECUTIVE_ORDER,
  MEMORANDUM: PrismaDocumentType.MEMORANDUM,
} as const;

// Prisma Query Types
export type WhereClause = Prisma.ExecutiveOrderWhereInput;
export type OrderByClause = Prisma.ExecutiveOrderOrderByWithRelationInput;
export type ExecutiveOrderSelect = Prisma.ExecutiveOrderSelect;
export type ExecutiveOrderInclude = Prisma.ExecutiveOrderInclude;

// Your existing interfaces remain the same
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

// ... rest of your existing interfaces ...

// Add new query helper types
export interface QueryOptions {
  where?: WhereClause;
  orderBy?: OrderByClause;
  select?: ExecutiveOrderSelect;
  include?: ExecutiveOrderInclude;
  skip?: number;
  take?: number;
}

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    total: number;
    page: number;
    limit: number;
  };
}

// Update ScrapedOrder to match Prisma types better
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

// Your existing type exports
export type PartialOrder = Partial<Order>;
export type CreateOrderInput = Omit<Order, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateOrderInput = Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>;