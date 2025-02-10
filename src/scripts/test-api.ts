import { DocumentType } from '@prisma/client';
import { logger } from '../utils/logger';

interface APIConfig {
  baseURL: string;
  defaultParams: {
    page: number;
    limit: number;
  };
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
  status: {
    id: number;
    name: string;
  } | null;
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
    
    logger.info('Response structure:', {
      totalCount: data.totalCount,
      pagination: data.pagination,
      orderCount: data.orders.length
    });

    if (data.orders.length > 0) {
      const firstOrder = data.orders[0];
      if (!firstOrder) {
        logger.info('No orders found in response');
        return true;
      }

      logger.info('First order:', {
        id: firstOrder.id,
        type: firstOrder.type,
        title: firstOrder.title,
        categoryCount: firstOrder.categories.length,
        agencyCount: firstOrder.agencies.length
      });

      if (firstOrder.categories.length > 0) {
        logger.info('Categories:', firstOrder.categories);
      } else {
        logger.info('No categories found for first order');
      }

      if (firstOrder.agencies.length > 0) {
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

// Safe check for script execution
const isMainModule = async () => {
  if (typeof process !== 'undefined' && process.argv.length > 1) {
    const scriptPath = process.argv[1];
    const scriptUrl = new URL(scriptPath, 'file://').href;
    return import.meta.url === scriptUrl;
  }
  return false;
};

if (await isMainModule()) {
  testEndpoint()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { testEndpoint };