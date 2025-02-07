// scripts/run-scraper.ts
import { DatabaseClient } from '@/lib/db';
import { scrapeExecutiveOrders } from '@/lib/scraper';
import { logger } from '@/utils/logger';

async function runScraper() {
  let prisma = null;

  try {
    prisma = await DatabaseClient.getInstance();
    logger.info('Starting scraper...');
    
    const result = await scrapeExecutiveOrders();
    
    if (!result.success || !result.data) {
      logger.warn('Scraper completed with no results:', result.message);
      return;
    }

    logger.info('Scraper completed successfully:', {
      message: result.message,
      count: result.data.length
    });

  } catch (error) {
    logger.error('Error running scraper:', error);
    process.exit(1);
  } finally {
    if (prisma) {
      await DatabaseClient.disconnect();
    }
  }
}

runScraper();