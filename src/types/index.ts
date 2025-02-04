// src/types/index.ts

export type FilterType = 'type' | 'category' | 'agency' | 'search' | 'dateFrom' | 'dateTo' | 'page';

export interface OrderFilters {
  type: string;
  category: string;
  agency: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface Agency {
  id: string;
  name: string;
}

export interface Order {
  id: string;
  orderNumber: string | null;
  type: 'Executive Order' | 'Memorandum';
  title: string;
  date: string;
  url: string;
  summary: string | null;
  notes: string | null;
  isNew: boolean;
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
  };
}

export interface UseOrdersReturn {
  data: OrdersResponse | null;
  error: string | null;
  loading: boolean;
}

export interface TimelineData {
  month: string;
  count: number;
}

// Type guard helpers
export function isValidOrder(order: any): order is Order {
  return (
    typeof order === 'object' &&
    typeof order.id === 'string' &&
    typeof order.title === 'string' &&
    typeof order.date === 'string' &&
    typeof order.url === 'string' &&
    Array.isArray(order.categories) &&
    Array.isArray(order.agencies) &&
    (order.type === 'Executive Order' || order.type === 'Memorandum')
  );
}

export function isValidCategory(category: any): category is Category {
  return (
    typeof category === 'object' &&
    typeof category.id === 'string' &&
    typeof category.name === 'string'
  );
}

export function isValidAgency(agency: any): agency is Agency {
  return (
    typeof agency === 'object' &&
    typeof agency.id === 'string' &&
    typeof agency.name === 'string'
  );
}

// Helper types for operations
export type PartialOrder = Partial<Order>;
export type CreateOrderInput = Omit<Order, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateOrderInput = Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>;

export const OrderTypes = {
  EXECUTIVE_ORDER: 'Executive Order',
  MEMORANDUM: 'Memorandum',
} as const;

export type OrderType = typeof OrderTypes[keyof typeof OrderTypes];