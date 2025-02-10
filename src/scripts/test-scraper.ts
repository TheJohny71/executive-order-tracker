// src/scripts/test-scraper.ts
import { DocumentScheduler } from '../lib/scheduler';
import { fetchOrders } from '../lib/api';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';  // Keep only what we need
import type { Order } from '../lib/api/types';

const prisma = new PrismaClient();  // We are using this, so keep it

async function testScraper() {
  try {
    logger.info('Starting scraper test...');

    // First, let's try to fetch orders directly
    logger.info('Attempting to fetch executive orders...');
    const response = await fetchOrders({
      page: 1,
      limit: 10
      // Remove sort as it's not in OrderFilters type
    });
    
    logger.info(`Fetched ${response.orders.length} orders from API`);
    
    if (response.orders.length > 0) {
      logger.info('Sample of fetched orders:', 
        response.orders.slice(0, 3).map((order: Order) => ({
          id: order.id,
          title: order.title,
          datePublished: order.date,
          type: order.type,
          number: order.number,
          status: order.status.name
        }))
      );
    }

    // Now let's test the scheduler
    logger.info('Initializing scheduler...');
    const scheduler = new DocumentScheduler(
      Number(process.env.SCHEDULER_INTERVAL_MINUTES) || 5
    );

    // Get current count
    const beforeCount = await prisma.order.count({
      where: {
        datePublished: { // Use datePublished instead of date
          gte: new Date('2025-01-01')
        }
      }
    });
    logger.info(`Current document count from 2025: ${beforeCount}`);

    // Initialize historical data
    logger.info('Initializing historical data...');
    await scheduler.initializeHistoricalData();

    // Get updated count
    const afterCount = await prisma.order.count({
      where: {
        datePublished: { // Use datePublished instead of date
          gte: new Date('2025-01-01')
        }
      }
    });
    logger.info(`Updated document count from 2025: ${afterCount}`);
    logger.info(`New documents added: ${afterCount - beforeCount}`);

    // Get latest documents
    const latestDocs = await prisma.order.findMany({
      where: {
        datePublished: { // Use datePublished instead of date
          gte: new Date('2025-01-01')
        }
      },
      orderBy: {
        datePublished: 'desc' // Use datePublished instead of date
      },
      take: 5,
      select: {
        id: true,
        title: true,
        datePublished: true, // Use datePublished instead of date
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
    logger.error('Error in scraper test:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testScraper()
  .catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });