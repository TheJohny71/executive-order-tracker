// src/scripts/test-api.ts
import { whiteHouseApi } from '../lib/api/whitehouse';

async function testApi() {
  try {
    console.log('Fetching documents from White House API...');
    const orders = await whiteHouseApi.fetchExecutiveOrders();
    
    console.log(`\nFetched ${orders.length} documents`);
    console.log('\nFirst few documents:');
    orders.slice(0, 3).forEach(order => {
      console.log('\n---');
      console.log('Title:', order.title);
      console.log('Date:', order.date);
      console.log('Type:', order.type);
      console.log('URL:', order.url);
    });

  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testApi();