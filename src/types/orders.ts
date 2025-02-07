// src/types/orders.ts
import { DocumentType } from '@prisma/client';

export interface OrdersResponse {
  orders: Array<{
    id: number;
    number: string;
    title: string;
    summary: string;
    link: string | null;
    type: DocumentType;
    category: string;
    agency: string;
    statusId: number;
    date: Date;
    status: {
      id: number;
      name: string;
    };
  }>;
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

export type WhereClause = {
  type?: DocumentType;
  statusId?: number;
  category?: string;
  agency?: string;
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