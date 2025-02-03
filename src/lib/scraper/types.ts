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
  }
  
  export interface CategoryKeywords {
    [key: string]: string[];
  }