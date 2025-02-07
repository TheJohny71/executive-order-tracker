import { DocumentType } from '@prisma/client';

export interface Order {
  id: number;
  number: string;
  title: string;
  description?: string;
  type: DocumentType;
  date: Date;
  link?: string;
  pdfUrl?: string;
  status?: {
    id: number;
    name: string;
    color?: string;
  };
  category?: string;
  agency?: string;
  metadata?: Record<string, unknown>;
}

export interface OrderStatus {
  id: number;
  name: string;
  color?: string;
}

export interface OrderMetadata {
  categories: string[];
  agencies: string[];
  statuses: OrderStatus[];
}

export interface OrderFilters {
  type: string;
  category: string;
  agency: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
  statusId?: number;
  sort?: string;
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

export type FilterType = 
  | 'type'
  | 'category'
  | 'agency'
  | 'search'
  | 'dateFrom'
  | 'dateTo'
  | 'page'
  | 'statusId'
  | 'sort';

export interface TimelineChartData {
  date: Date;
  count: number;
  orders: Order[];
}

export interface OrderCardProps {
  order: Order;
  viewMode: 'expanded' | 'compact';
  isComparing: boolean;
  compareItems: Order[];
  onCompareToggle: (order: Order) => void;
  onRecentlyViewed: (order: Order) => void;
  onFilterChange: (type: FilterType, value: string) => void;
  onPdfDownload: (order: Order) => void;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

export interface TimelineChartProps {
  orders: Order[];
  height?: number;
  onBarClick?: (date: Date, orders: Order[]) => void;
}

export interface FilterBarProps {
  filters: OrderFilters;
  metadata: OrderMetadata;
  onFilterChange: (type: FilterType, value: string) => void;
}

export interface MobileFiltersProps extends FilterBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface StatusCountsProps {
  orders: Order[];
}

export interface LoadingSkeletonProps {
  count?: number;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
}