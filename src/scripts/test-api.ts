import { DocumentType } from '@prisma/client';
import { logger } from '../utils/logger';

interface APIConfig {
  baseURL: string;
  defaultParams: {
    page: number;
    limit: number;
  };
}

interface OrderStatus {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface Agency {
  id: number;
  name: string;
}

interface Order {
  id: number;
  type: DocumentType;
  number: string | null;
  title: string;
  summary: string | null;
  datePublished: string;
  link: string | null;
  createdAt: string;
  updatedAt: string;
  statusId: number;
  status: OrderStatus | null;
  categories: Category[];
  agencies: Agency[];
}

interface APIResponse {
  totalCount: number;
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
  metadata?: {
    categories: string[];
    agencies: string[];
    statuses: string[];
  };
}

interface OrderSummary {
  id: number;
  type: DocumentType;
  title: string;
  categoryCount: number;
  agencyCount: number;
}

const config: APIConfig = {
  baseURL: process.env.API_BASE_URL || "http://localhost:3000",
  defaultParams: {
    page: 1,
    limit: 10
  }
} as const;

async function fetchAPI(url: string): Promise<APIResponse> {
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }
  
  const data = await response.json();
  return data as APIResponse;
}

function summarizeOrder(order: Order): OrderSummary {
  return {
    id: order.id,
    type: order.type,
    title: order.title,
    categoryCount: order.categories?.length ?? 0,
    agencyCount: order.agencies?.length ?? 0
  };
}

async function testEndpoint(): Promise<boolean> {
  try {
    logger.info('Starting API test...');
    
    const params = new URLSearchParams({
      page: config.defaultParams.page.toString(),
      limit: config.defaultParams.limit.toString()
    });
    
    const fullURL = new URL(`/api/orders?${params}`, config.baseURL);
    logger.info('Testing:', fullURL.toString());
    
    const data = await fetchAPI(fullURL.toString());
    
    logger.info('Response structure:', {
      totalCount: data.totalCount,
      pagination: data.pagination,
      orderCount: data.orders.length,
      metadata: data.metadata
    });

    if (!data.orders.length) {
      logger.info('No orders found in response');
      return true;
    }

    const firstOrder = data.orders[0];
    if (!firstOrder) {
      logger.info('No first order found');
      return true;
    }

    logger.info('First order:', summarizeOrder(firstOrder));

    if (firstOrder.categories?.length > 0) {
      logger.info('Categories:', firstOrder.categories);
    } else {
      logger.info('No categories found for first order');
    }

    if (firstOrder.agencies?.length > 0) {
      logger.info('Agencies:', firstOrder.agencies);
    } else {
      logger.info('No agencies found for first order');
    }

    logger.info('Test completed successfully');
    return true;
  } catch (error) {
    logger.error('Test failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

async function isMainModule(): Promise<boolean> {
  try {
    if (typeof process === 'undefined' || !process.argv[1]) {
      return false;
    }
    const scriptUrl = new URL(process.argv[1], 'file://').href;
    return import.meta.url === scriptUrl;
  } catch {
    return false;
  }
}

if (await isMainModule()) {
  testEndpoint()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Script failed:', error);
      process.exit(1);
    });
}

export { testEndpoint, type APIResponse, type Order };