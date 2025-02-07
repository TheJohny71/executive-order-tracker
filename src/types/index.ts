import { DocumentType } from '@prisma/client';

export interface Category {
  id: string;
  name: string;
}

export interface Agency {
  id: string;
  name: string;
  abbreviation?: string;
}

export interface Amendment {
  id: string;
  dateAmended: Date | string;
  description: string;
}

export interface Citation {
  id: string;
  description: string;
}

export interface Status {
  id: string;
  name: string;
}

export interface Order {
  id: string;
  identifier: string;
  type: DocumentType;
  title: string;
  date: Date | string;
  url: string;
  summary: string | null;
  notes: string | null;
  content: string | null;
  isNew: boolean;
  status: Status;
  categories: Category[];
  agencies: Agency[];
  amendments: Amendment[];
  citations: Citation[];
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
  type: string;
  category: string;
  agency: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
  statusId?: string;
  sort?: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
}

export interface OrdersMetadata {
  categories: string[];
  agencies: string[];
}

export interface OrdersResponse {
  orders: Order[];
  pagination: PaginationInfo;
  metadata: OrdersMetadata;
}