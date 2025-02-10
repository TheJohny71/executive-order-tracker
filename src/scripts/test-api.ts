// src/scripts/test-api.ts
import { fetchOrders } from '../lib/api';
import type { Order } from '../lib/api/types';

async function main() {
  try {
    console.log('Fetching orders...');
    const response = await fetchOrders();
    const orders = response.orders;
    
    console.log('\nFirst 3 orders:');
    orders.slice(0, 3).forEach((order: Order) => {
      console.log('\n----------------------------------------');
      console.log(`Title: ${order.title}`);
      console.log(`Number: ${order.number}`);
      console.log(`Date: ${order.date}`);
      console.log(`Type: ${order.type}`);
      console.log(`Category: ${order.category}`);
      console.log(`Agency: ${order.agency || 'N/A'}`);
      console.log('----------------------------------------\n');
    });

    console.log('Pagination Info:');
    console.log(`Total: ${response.pagination.total}`);
    console.log(`Page: ${response.pagination.page}`);
    console.log(`Limit: ${response.pagination.limit}`);
    console.log(`Has More: ${response.pagination.hasMore}`);
  } catch (error) {
    console.error('Error testing API:', error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit());