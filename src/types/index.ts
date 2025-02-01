export interface Order {
  id: string;
  orderNumber?: string;
  type: string;
  title: string;
  date: string;
  url: string;
  summary?: string;
  notes?: string;
  isNew: boolean;
  categories: { name: string }[];
  agencies: { name: string }[];
}

export interface OrdersResponse {
  orders: Order[];
  metadata: {
    categories: string[];
    agencies: string[];
  };
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    limit: number;
  };
}

export interface OrderFilters {
  type?: string;
  category?: string;
  agency?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}