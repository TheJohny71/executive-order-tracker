// src/scripts/test-api.ts
import { fetchOrders } from '../lib/api';
import type { Order, OrderFilters } from '../types';
import { logger } from '../utils/logger';

async function main() {
  try {
    logger.info('Starting API test...');
    
    const baseUrl = process.env.NEXT_PUBLIC_AWS_API_URL || 'http://localhost:3000';
    logger.info('API Base URL:', baseUrl);
    
    logger.info('Fetching orders...');
    
    // Create params object with correct types from OrderFilters interface
    const params: Partial<OrderFilters> = {
      page: 1,
      limit: 10,
      type: 'all',
      category: '',
      agency: '',
      search: '',
      sort: 'desc'
    };

    const response = await fetchOrders(params);
    
    logger.info(`Successfully fetched ${response.orders.length} orders`);
    logger.info(`Total orders available: ${response.pagination.total}`);
    
    if (response.orders.length > 0) {
      logger.info('Sample of fetched orders:', 
        response.orders.slice(0, 3).map((order: Order) => ({
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

      logger.info('Available categories:', response.metadata.categories);
      logger.info('Available agencies:', response.metadata.agencies);
      logger.info('Available statuses:', response.metadata.statuses);
    }

    logger.info('Test completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('API test failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});

export { main };