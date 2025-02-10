// src/scripts/test-api.ts
import { logger } from '../utils/logger';
import type { Order } from '../types';

interface APIConfig {
  baseURL: string;
  defaultParams: {
    page: number;
    limit: number;
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
    
    // Construct URL with parameters
    const params = new URLSearchParams({
      page: config.defaultParams.page.toString(),
      limit: config.defaultParams.limit.toString()
    });
    
    const fullURL = new URL(`/api/orders?${params}`, config.baseURL);
    logger.info('Testing API endpoint:', fullURL.toString());
    
    // Make request
    const response = await fetch(fullURL.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Log results
    if (data.orders && data.orders.length > 0) {
      logger.info(`Successfully fetched ${data.orders.length} orders`);
      
      // Log a sample of the orders
      logger.info('Sample of fetched orders:', 
        data.orders.slice(0, 3).map((order: Order) => ({
          id: order.id,
          title: order.title,
          number: order.number,
          datePublished: order.datePublished,
          type: order.type,
          category: order.category,
          agency: order.agency || 'N/A',
          status: order.status.name
        }))
      );

      // Log pagination info if available
      if (data.pagination) {
        logger.info('Pagination info:', {
          total: data.pagination.total,
          currentPage: data.pagination.page,
          hasMore: data.pagination.hasMore
        });
      }
    } else {
      logger.info('No orders found in the response');
    }

    logger.info('API test completed successfully');
    return true;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('API test failed:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    } else {
      logger.error('API test failed with unknown error type:', error);
    }
    throw error;
  }
}

// Execute the test
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  testEndpoint()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { testEndpoint };