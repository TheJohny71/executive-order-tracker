export interface ScrapedOrder {
  type: string;
  orderNumber: string | undefined;
  title: string;
  date: Date;
  url: string;
  summary: string;
  agencies: string[];
  categories: string[];
}

export interface RawOrder {
  type: string;
  orderNumber: string | undefined;
  title: string;
  date: string;
  url: string;
  apiUrl?: string; // Added for Federal Register API support
  content?: string; // Added to store API content if available
}

export interface CategoryKeywords {
  [key: string]: string[];
}