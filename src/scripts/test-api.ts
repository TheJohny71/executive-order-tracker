// src/scripts/test-api.ts
import { fetchOrders } from '../lib/api';
import type { Order } from '../lib/api/types';
import { logger } from '../utils/logger';

async function main() {
  try {
    logger.info('Fetching orders...');
    const response = await fetchOrders({
      page: 1,
      limit: 10,
      // Remove sort as it's not in OrderFilters type
    });
    
    logger.info(`Fetched ${response.orders.length} orders`);
    
    if (response.orders.length > 0) {
      logger.info('First 3 orders:', 
        response.orders.slice(0, 3).map((order: Order) => ({
          id: order.id,
          title: order.title,
          number: order.number,
          datePublished: order.date, // Match Prisma schema field
          type: order.type,
          category: order.category,
          agency: order.agency || 'N/A',
          status: order.status.name
        }))
      );
    }

    logger.info('Metadata:', {
      categories: response.metadata.categories.length,
      agencies: response.metadata.agencies.length,
      statuses: response.metadata.statuses.length
    });

    logger.info('Pagination:', response.pagination);
  } catch (error) {
    logger.error('Error testing API:', error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  })
  .finally(() => process.exit(0));