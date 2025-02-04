// src/types/index.ts

// Extend FilterType to include status and sorting
export type FilterType = 'type' | 'category' | 'agency' | 'search' | 'dateFrom' | 'dateTo' | 'page' | 'status' | 'sort';

// Update OrderFilters to include new fields
export interface OrderFilters {
  type: string;
  category: string;
  agency: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
  status?: OrderStatus;
  sort?: 'date' | 'title' | 'type' | '-date' | '-title' | '-type';
}

export interface Category {
  id: string;
  name: string;
}

export interface Agency {
  id: string;
  name: string;
}

// Update Order interface with stricter types
export interface Order {
  id: string;
  identifier: string;
  orderNumber: string | null;
  type: OrderType;
  title: string;
  date: string;
  url: string;
  summary: string | null;
  notes: string | null;
  content: string | null;
  isNew: boolean;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  categories: Category[];
  agencies: Agency[];
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
    statuses: OrderStatus[];  // Added to support status filtering
  };
}

export interface UseOrdersReturn {
  data: OrdersResponse | null;
  error: string | null;
  loading: boolean;
  lastUpdate?: Date;  // Added to track last fetch time
  refresh: () => Promise<void>;  // Added manual refresh function
}

export interface TimelineData {
  month: string;
  count: number;
  byType?: Record<OrderType, number>;  // Added to support type breakdown
}

// Update OrderStatus to be more type-safe
export const OrderStatus = {
  ACTIVE: 'Active',
  REVOKED: 'Revoked',
  SUPERSEDED: 'Superseded',
  AMENDED: 'Amended',
  PENDING: 'Pending'  // Added for newly scraped orders pending review
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const OrderTypes = {
  EXECUTIVE_ORDER: 'Executive Order',
  MEMORANDUM: 'Memorandum',
} as const;

export type OrderType = typeof OrderTypes[keyof typeof OrderTypes];

// Enhanced scheduler configuration
export interface SchedulerConfig {
  intervalMinutes: number;
  retryAttempts: number;
  retryDelay: number;
  maxConcurrent?: number;  // Added to limit concurrent operations
  notificationConfig?: {
    email?: string[];
    webhook?: string;
    slackWebhook?: string;
  };
}

// Update ScrapedOrder to match Order interface more closely
export interface ScrapedOrder {
  identifier: string;
  orderNumber: string | null;
  type: OrderType;
  title: string;
  date: Date;
  url: string;
  summary: string | null;
  notes: string | null;
  content?: string | null;
  categories: Pick<Category, 'name'>[];
  agencies: Pick<Agency, 'name'>[];
  isNew: boolean;
  status?: OrderStatus;  // Optional as it might be set later
}

// Enhanced type guards
export function isValidOrder(order: unknown): order is Order {
  if (!order || typeof order !== 'object') return false;
  
  const o = order as Order;
  return (
    typeof o.id === 'string' &&
    typeof o.identifier === 'string' &&
    typeof o.title === 'string' &&
    typeof o.date === 'string' &&
    typeof o.url === 'string' &&
    Array.isArray(o.categories) &&
    Array.isArray(o.agencies) &&
    Object.values(OrderTypes).includes(o.type) &&
    Object.values(OrderStatus).includes(o.status) &&
    o.categories.every(isValidCategory) &&
    o.agencies.every(isValidAgency)
  );
}

export function isValidCategory(category: unknown): category is Category {
  if (!category || typeof category !== 'object') return false;
  
  const c = category as Category;
  return typeof c.id === 'string' && typeof c.name === 'string';
}

export function isValidAgency(agency: unknown): category is Agency {
  if (!agency || typeof agency !== 'object') return false;
  
  const a = agency as Agency;
  return typeof a.id === 'string' && typeof a.name === 'string';
}

// Enhanced operation types
export type PartialOrder = Partial<Order>;
export type CreateOrderInput = Omit<Order, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateOrderInput = Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>;

// Enhanced scheduler types
export type SchedulerStatus = 'running' | 'stopped' | 'error' | 'paused';
export type SchedulerEvent = 
  | 'check.start' 
  | 'check.complete' 
  | 'check.error' 
  | 'document.new'
  | 'document.update'
  | 'scheduler.start'
  | 'scheduler.stop'
  | 'scheduler.error';

export interface SchedulerEventData {
  timestamp: string;
  type: SchedulerEvent;
  data?: {
    documentIds?: string[];
    error?: Error;
    status?: SchedulerStatus;
    message?: string;
  };
}

// Added utility type for API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}