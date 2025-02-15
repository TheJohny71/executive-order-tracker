// File: src/types/stats.ts
// Description: Type definitions for the statistics component

import { DocumentType } from '@prisma/client';

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