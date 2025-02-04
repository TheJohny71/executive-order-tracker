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
export function isValidOrder(order: unknown): order is Order {
  return (
    typeof order === 'object' &&
    order !== null &&
    typeof (order as Order).id === 'string' &&
    typeof (order as Order).title === 'string' &&
    typeof (order as Order).date === 'string' &&
    typeof (order as Order).url === 'string' &&
    Array.isArray((order as Order).categories) &&
    Array.isArray((order as Order).agencies) &&
    ((order as Order).type === 'Executive Order' || (order as Order).type === 'Memorandum')
  );
}

export function isValidCategory(category: unknown): category is Category {
  return (
    typeof category === 'object' &&
    category !== null &&
    typeof (category as Category).id === 'string' &&
    typeof (category as Category).name === 'string'
  );
}

export function isValidAgency(agency: unknown): agency is Agency {
  return (
    typeof agency === 'object' &&
    agency !== null &&
    typeof (agency as Agency).id === 'string' &&
    typeof (agency as Agency).name === 'string'
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