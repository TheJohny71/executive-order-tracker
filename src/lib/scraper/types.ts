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

export interface CategoryKeywords {
  [key: string]: string[];
}

export interface RetryOptions {
  retries?: number;
  delay?: number;
  backoff?: number;
}