import type { ScrapedOrder } from './types.js';
export declare const saveOrdersToDynamoDB: (orders: ScrapedOrder[]) => Promise<void>;
