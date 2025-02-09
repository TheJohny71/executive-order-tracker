import { DocumentScheduler } from '../lib/scheduler';
import { logger } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testScraper() {
  try {
    logger.info('Starting scraper test...');

    // Initialize scheduler with 5-minute interval for testing
    const scheduler = new DocumentScheduler(5);

    // Force historical data initialization
    logger.info('Initializing historical data...');
    await scheduler.initializeHistoricalData();

    // Get current document count
    const beforeCount = await prisma.order.count();
    logger.info(`Current document count: ${beforeCount}`);

    // Perform manual check
    logger.info('Performing manual check for new documents...');
    await scheduler.manualCheck();

    // Get updated count
    const afterCount = await prisma.order.count();
    logger.info(`Updated document count: ${afterCount}`);
    logger.info(`New documents added: ${afterCount - beforeCount}`);

    // Get latest documents
    const latestDocs = await prisma.order.findMany({
      orderBy: { datePublished: 'desc' },
      take: 5,
      select: {
        title: true,
        datePublished: true,
        type: true,
        number: true
      }
    });

    logger.info('Latest documents:', latestDocs);

  } catch (error) {
    logger.error('Error in scraper test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testScraper();