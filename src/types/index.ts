import { DocumentType } from "@prisma/client";

// Filter Types
export type FilterType =
  | "type"
  | "category"
  | "agency"
  | "dateFrom"
  | "dateTo"
  | "search"
  | "page"
  | "limit"
  | "statusId"
  | "sort";

export type SelectableValue = string | number | null;

// Database Record Type (matches Prisma schema)
export interface OrderDbRecord {
  id: number;
  number: string | null;
  title: string;
  summary: string | null;
  type: DocumentType;
  datePublished: Date;
  statusId: number;
  link: string | null;
  createdAt: Date;
  updatedAt: Date;
  categories: Array<{ id: number; name: string }>;
  agencies: Array<{ id: number; name: string }>;
  status: {
    id: number;
    name: string;
    color: string | null;
  } | null;
}

// Base Types for Enhanced UI
export interface Agency {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Status {
  id: number;
  name: string;
  color: string | null;
}

// Order Interface - Enhanced for UI
export interface Order {
  id: number;
  number: string | null;
  title: string;
  summary: string | null;
  type: DocumentType;
  datePublished: Date;
  link: string | null;
  createdAt: Date;
  updatedAt: Date;
  statusId: number;
  status: Status;
  agencies: Agency[];
  categories: Category[];
}

// Filter and Query Types
export interface OrderFilters {
  type: DocumentType | "all" | "";
  category: string;
  agency: string;
  dateFrom?: string;
  dateTo?: string;
  search: string;
  page: number;
  limit: number;
  statusId?: number;
  sort?: "asc" | "desc" | string;
}

export interface OrderMetadata {
  categories: string[];
  agencies: string[];
  statuses: Status[];
  total?: number;
  updatedAt?: string;
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

// Component Props Types
export interface ViewModeProps {
  viewMode: "standard" | "focus";
}

export interface SelectableProps {
  isSelectable?: boolean;
  onSelect?: () => void;
  isComparing?: boolean;
}

// Stats Types
export interface OrderStats {
  totalOrders: number;
  activeOrders: number;
  newOrdersThisMonth: number;
  pendingReview: number;
}

export interface OrderStatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface OrderTypeDistribution {
  type: DocumentType;
  count: number;
  percentage: number;
}

export interface DashboardStats {
  orderStats: OrderStats;
  statusDistribution: OrderStatusDistribution[];
  typeDistribution: OrderTypeDistribution[];
  lastUpdated: Date;
}

// Query Related Types
export interface WhereClause {
  type?: DocumentType;
  statusId?: number;
  identifier?: string;
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
  datePublished?: {
    gte?: Date;
    lte?: Date;
  };
  OR?: Array<{
    title?: { contains: string; mode: "insensitive" };
    summary?: { contains: string; mode: "insensitive" };
    number?: { contains: string; mode: "insensitive" };
  }>;
}

export interface OrderByClause {
  [key: string]: "asc" | "desc";
}

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Database Input Types
export interface OrderCreateInput {
  title: string;
  type: DocumentType;
  number: string | null;
  summary: string | null;
  datePublished: Date;
  link: string | null;
  status: {
    connect: {
      id: number;
    };
  };
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
  type?: DocumentType;
  title?: string;
  datePublished?: Date;
  link?: string;
  summary?: string;
  number?: string;
  statusId?: number;
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

// Scraper Related Types
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

export type { DocumentType };