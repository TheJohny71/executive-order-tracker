// src/scripts/test-api.ts
import { fetchOrders } from '../lib/api';
import type { Order } from '../lib/api/types';
import { logger } from '../utils/logger';
import { fileURLToPath } from 'url';

async function main() {
  try {
    logger.info('Starting API test...');
    logger.info('API Base URL:', process.env.NEXT_PUBLIC_AWS_API_URL || 'http://localhost:3000');
    
    logger.info('Fetching orders...');
    const response = await fetchOrders({
      page: 1,
      limit: 10
    });
    
    logger.info(`Successfully fetched ${response.orders.length} orders`);
    
    if (response.orders.length > 0) {
      logger.info('Sample of fetched orders:', 
        response.orders.slice(0, 3).map((order: Order) => ({
          id: order.id,
          title: order.title,
          number: order.number,
          date: order.date,
          type: order.type,
          category: order.category,
          agency: order.agency || 'N/A'
        }))
      );
    }

    logger.info('Test completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('API test failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// ES Module equivalent of require.main === module check
const isMainModule = import.meta.url === fileURLToPath(process.argv[1]);

if (isMainModule) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { main };