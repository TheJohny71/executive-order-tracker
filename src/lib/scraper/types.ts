import { DocumentType } from "@prisma/client";

// Single export for each interface
export interface ScrapedOrder {
  identifier: string;
  type: DocumentType;
  title: string;
  date: Date;
  url: string;
  summary: string | null;
  notes: string | null;
  content: string | null;
  statusId: string;
  categories: { name: string }[];
  agencies: { name: string }[];
  isNew: boolean;
}

export interface SpawResponse {
  data: {
    title: string;
    text: string;
    date: string;
    url: string;
    metadata: {
      identifier?: string;
      type?: string;
      summary?: string;
      notes?: string;
    };
  }[];
}

export interface CategoryKeywords {
  [key: string]: string[];
}

export interface AgencyKeywords {
  [key: string]: string[];
}

export interface ScraperConfig {
  baseUrl: string;
  startYear: number;
  endYear: number;
  batchSize: number;
  delayBetweenRequests: number;
}

export interface ScraperResult {
  success: boolean;
  ordersScraped: number;
  errors: string[];
  newOrders: ScrapedOrder[];
  updatedOrders: ScrapedOrder[];
}

export interface ProcessingOptions {
  extractCategories?: boolean;
  extractAgencies?: boolean;
  parseContent?: boolean;
  defaultStatusId?: string;
}

// Remove the duplicate type exports at the bottom
