// src/scripts/test-api.ts
import { api } from '../lib/api';
import type { Order } from '../lib/api/types';

async function main() {
  try {
    console.log('Fetching orders...');
    const response = await api.orders.fetch();
    const orders = response.orders;
    
    console.log('\nFirst 3 orders:');
    orders.slice(0, 3).forEach((order: Order) => {
      console.log(`\nTitle: ${order.title}`);
      console.log(`Number: ${order.number}`);
      console.log(`Date: ${order.date}`);
      console.log(`Type: ${order.type}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

main();