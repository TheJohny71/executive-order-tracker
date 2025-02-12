export interface LambdaEvent {
    // Add any specific event properties you need
    httpMethod?: string;
    path?: string;
  }
  
  export enum DocumentType {
    EXECUTIVE_ORDER = 'EXECUTIVE_ORDER',
    PRESIDENTIAL_MEMORANDUM = 'PRESIDENTIAL_MEMORANDUM'
  }
  
  export interface ScrapedOrder {
    sourceId: string;
    title: string;
    date: string;
    url: string;
    type: DocumentType;
    number: string | null;
    description: string;
  }
  
  export interface ScraperResponse {
    success: boolean;
    orders?: ScrapedOrder[];
    count?: number;
    timestamp?: string;
    message?: string;
    error?: string;
  }
  
  export interface DynamoDBItem {
    pk: string;
    sk: string;
    sourceId: string;
    title: string;
    date: string;
    url: string;
    number: string | null;
    type: DocumentType;
    description: string;
    createdAt: string;
    updatedAt: string;
  }