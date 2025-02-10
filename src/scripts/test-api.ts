import { logger } from '../utils/logger';

interface APIConfig {
  baseURL: string;
  defaultParams: {
    page: number;
    limit: number;
  };
}

const config: APIConfig = {
  baseURL: "http://localhost:3003",
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.orders?.length > 0) {
      logger.info(`Fetched ${data.orders.length} orders`);
      logger.info('Sample:', data.orders[0]);
    } else {
      logger.info('No orders found');
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
