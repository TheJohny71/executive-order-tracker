// src/scripts/test-scraper.ts
import { DocumentScheduler } from '../lib/scheduler';
import { fetchOrders } from '../lib/api';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import type { Order } from '../lib/api/types';

const prisma = new PrismaClient();

async function testScraper() {
  try {
    logger.info('Starting scraper test...');
    logger.info('API Base URL:', process.env.NEXT_PUBLIC_AWS_API_URL || 'http://localhost:3000');

    // Test API connection
    logger.info('Testing API connection...');
    const response = await fetchOrders({
      page: 1,
      limit: 10
    });
    
    logger.info(`Successfully connected to API. Found ${response.orders.length} orders`);
    
    // Rest of your scraper test logic...
    
  } catch (error) {
    logger.error('Scraper test failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testScraper()
    .catch((error) => {
      logger.error('Unhandled error:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
}