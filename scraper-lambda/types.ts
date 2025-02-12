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