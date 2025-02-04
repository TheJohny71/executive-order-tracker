// src/lib/scraper/types.ts
import type { Category, Agency, OrderType } from '@/types';

export interface ScrapedOrder {
  orderNumber: string | null;
  type: OrderType;
  title: string;
  date: Date;
  url: string;
  summary: string | null;
  notes: string | null;
  categories: Category[];
  agencies: Agency[];
}

export interface SpawResponse {
  data: {
    title: string;
    text: string;
    date: string;
    url: string;
    metadata: {
      orderNumber?: string;
      type?: string;
    };
  }[];
}

// This matches the structure used in your utils.ts file
export interface CategoryKeywords {
  [key: string]: string[];
}