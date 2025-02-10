// src/scripts/test-scraper.ts
import { fetchOrders } from '../lib/api';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import type { OrdersResponse } from '../lib/api/types';

const prisma = new PrismaClient();

async function testScraper() {
  try {
    logger.info('Starting scraper test...');
    logger.info('API Base URL:', process.env.NEXT_PUBLIC_AWS_API_URL || 'http://localhost:3000');

    // Test API connection
    logger.info('Testing API connection...');
    const response: OrdersResponse = await fetchOrders({
      page: 1,
      limit: 10
    });
    
    logger.info(`Successfully connected to API. Found ${response.orders.length} orders`);
    
    // Get current count
    const beforeCount = await prisma.order.count({
      where: {
        datePublished: {
          gte: new Date('2025-01-01')
        }
      }
    });
    logger.info(`Current document count from 2025: ${beforeCount}`);

    // Get latest documents
    const latestDocs = await prisma.order.findMany({
      where: {
        datePublished: {
          gte: new Date('2025-01-01')
        }
      },
      orderBy: { datePublished: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        datePublished: true,
        type: true,
        number: true,
        link: true,
        status: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    logger.info('Latest documents in database:', latestDocs);

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

export { testScraper };