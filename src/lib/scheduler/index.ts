// src/lib/scheduler/index.ts

import { scrapeExecutiveOrders } from '../scraper';
import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(pretty({ colorize: true }));
const FIFTEEN_MINUTES = 15 * 60 * 1000; // 15 minutes in milliseconds
const MAX_RETRIES = 3;
let consecutiveFailures = 0;

async function runScheduledScrape() {
  try {
    logger.info('Starting scheduled scrape');
    await scrapeExecutiveOrders();
    consecutiveFailures = 0; // Reset failure count on success
    logger.info('Scheduled scrape completed successfully');
  } catch (error: unknown) {
    consecutiveFailures++;
    logger.error('Scheduled scrape failed:', {
      error: error instanceof Error ? error.message : String(error),
      consecutiveFailures,
      maxRetries: MAX_RETRIES
    });

    // If we've had too many failures, stop the scheduler
    if (consecutiveFailures >= MAX_RETRIES) {
      logger.error('Too many consecutive failures. Stopping scheduler.');
      process.exit(1);
    }
  } finally {
    // Schedule next run
    logger.info(`Scheduling next scrape in 15 minutes...`);
    setTimeout(runScheduledScrape, FIFTEEN_MINUTES);
  }
}

// Start the scheduler
logger.info('Starting scheduler...');
runScheduledScrape();