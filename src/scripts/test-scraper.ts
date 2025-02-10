// src/scripts/test-scraper.ts
import { DocumentScheduler } from '../lib/scheduler';
import { api } from '../lib/api';
import { logger } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testScraper() {
  try {
    logger.info('Starting scraper test...');

    // First, let's try to fetch orders directly
    logger.info('Attempting to fetch executive orders...');
    const response = await api.orders.fetch();
    const orders = response.orders;
    logger.info(`Fetched ${orders.length} orders from API`);
    
    if (orders.length > 0) {
      logger.info('Sample of fetched orders:', 
        orders.slice(0, 3).map(order => ({
          title: order.title,
          date: order.date,
          type: order.type,
          number: order.number
        }))
      );
    }

    // Now let's test the scheduler
    logger.info('Initializing scheduler...');
    const scheduler = new DocumentScheduler(5); // 5-minute interval for testing

    // Get current count
    const beforeCount = await prisma.order.count({
      where: {
        datePublished: {
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
        datePublished: {
          gte: new Date('2025-01-01')
        }
      }
    });
    logger.info(`Updated document count from 2025: ${afterCount}`);
    logger.info(`New documents added: ${afterCount - beforeCount}`);

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
        title: true,
        datePublished: true,
        type: true,
        number: true,
        link: true
      }
    });

    logger.info('Latest documents in database:', latestDocs);

  } catch (error) {
    logger.error('Error in scraper test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testScraper()
  .catch(console.error)
  .finally(() => process.exit());