import type { APIGatewayProxyEvent } from 'aws-lambda';

export enum DocumentType {
    EXECUTIVE_ORDER = 'EXECUTIVE_ORDER',
    PRESIDENTIAL_MEMORANDUM = 'PRESIDENTIAL_MEMORANDUM'
}

export interface ScrapedOrder {
    title: string;
    date: string;
    url: string;
    number: string | null;
    type: DocumentType;
    description: string;
    sourceId: string;
}

export interface DynamoDBItem {
    pk: string;      // Primary key (sourceId)
    sk: string;      // Sort key (type)
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

export interface ScraperResponse {
    success: boolean;
    orders?: ScrapedOrder[];
    count?: number;
    timestamp?: string;
    message?: string;
    error?: string;
}

export interface DynamoDBResponse {
    success: boolean;
    message?: string;
    error?: string;
}

export type LambdaEvent = APIGatewayProxyEvent;

# File: scraper-lambda/package.json
{
  "name": "executive-order-scraper-lambda",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "node --experimental-specifier-resolution=node --loader ts-node/esm test.ts",
    "watch": "node --experimental-specifier-resolution=node --loader ts-node/esm --watch test.ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.744.0",
    "@aws-sdk/lib-dynamodb": "^3.744.0",
    "@sparticuz/chromium": "^119.0.0",
    "puppeteer-core": "^24.2.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.134",
    "@types/node": "^20.11.17",
    "ts-node": "^10.9.2",
    "typescript": "^5.7.3"
  }
}