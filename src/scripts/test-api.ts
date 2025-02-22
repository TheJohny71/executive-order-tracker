// src/scripts/test-api.ts
import { logger } from '../utils/logger';

interface APIConfig {
  baseURL: string;
  defaultParams: {
    page: number;
    limit: number;
  };
}

enum DocumentType {
  EXECUTIVE_ORDER = 'EXECUTIVE_ORDER',
  PROCLAMATION = 'PROCLAMATION',
  MEMORANDUM = 'MEMORANDUM'
}

interface Order {
  id: number;
  type: DocumentType;
  number?: string;
  title: string;
  summary?: string;
  datePublished: string;
  link?: string;
  createdAt: string;
  updatedAt: string;
  statusId?: number;
  status?: {
    id: number;
    name: string;
  };
  categories: Array<{
    id: number;
    name: string;
  }>;
  agencies: Array<{
    id: number;
    name: string;
  }>;
}

interface APIResponse {
  totalCount: number;
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

const config: APIConfig = {
  baseURL: "http://localhost:3000",
  defaultParams: {
    page: 1,
    limit: 10
  }
};

async function testEndpoint() {
  try {
    logger.info('Starting API test...');
    
    const params = new URLSearchParams({
      page: config.defaultParams.page.toString(),
      limit: config.defaultParams.limit.toString()
    });
    
    const fullURL = new URL(`/api/orders?${params}`, config.baseURL);
    logger.info('Testing:', fullURL.toString());
    
    const response = await fetch(fullURL.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const data = await response.json() as APIResponse;
    
    // Add detailed logging
    logger.info('Response structure:', {
      totalCount: data.totalCount,
      pagination: data.pagination,
      orderCount: data.orders?.length ?? 0
    });

    if (data.orders?.length > 0) {
      const firstOrder = data.orders[0];
      logger.info('First order:', {
        id: firstOrder.id,
        type: firstOrder.type,
        title: firstOrder.title,
        categoryCount: firstOrder.categories?.length ?? 0,
        agencyCount: firstOrder.agencies?.length ?? 0
      });

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
    } else {
      logger.info('No orders found in response');
    }

    logger.info('Test completed');
    return true;
  } catch (error) {
    logger.error('Test failed:', error);
    throw error;
  }
}

if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  testEndpoint()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { testEndpoint };