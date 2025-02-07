// scripts/run-scraper.ts
import { scrapeExecutiveOrders } from '@/lib/scraper';
import { logger } from '@/utils/logger';

async function runScraper() {
  try {
    const result = await scrapeExecutiveOrders();
    
    if (!result.success) {
      logger.warn('Scraping failed:', result.message);
      process.exit(1);
    }

    logger.info('Scraping completed successfully:', {
      message: result.message,
      documentsProcessed: result.data?.length || 0
    });

  } catch (error) {
    logger.error('Error running scraper:', error);
    process.exit(1);
  }
}

runScraper();