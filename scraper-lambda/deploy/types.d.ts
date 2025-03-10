import type { APIGatewayProxyEvent } from 'aws-lambda';
export declare enum DocumentType {
    EXECUTIVE_ORDER = "EXECUTIVE_ORDER",
    PRESIDENTIAL_MEMORANDUM = "PRESIDENTIAL_MEMORANDUM"
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
export interface ScraperResponse {
    success: boolean;
    orders?: ScrapedOrder[];
    count?: number;
    timestamp?: string;
    message?: string;
    error?: string;
}
export type LambdaEvent = APIGatewayProxyEvent;
