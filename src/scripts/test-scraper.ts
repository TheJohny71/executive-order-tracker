// File: scripts/test-scraper.ts
/* 
   Run via:
   npx ts-node scripts/test-scraper.ts
*/

import fetch from 'node-fetch'; // If on Node < 18
import { logger } from '../utils/logger';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testScraper() {
  logger.info('Starting testScraper...');

  // 1) Trigger the scraper
  const scrapeRes = await fetch(`${BASE_URL}/api/scrape`);
  if (!scrapeRes.ok) {
    throw new Error(`Scrape failed with status ${scrapeRes.status}`);
  }
  const scrapeData = await scrapeRes.json();
  logger.info('Scrape response:', scrapeData);

  // 2) Fetch orders
  const ordersRes = await fetch(`${BASE_URL}/api/orders?limit=5`);
  if (!ordersRes.ok) {
    throw new Error(`Failed to fetch orders. Status: ${ordersRes.status}`);
  }
  const ordersJson = await ordersRes.json();
  logger.info('Orders response:', ordersJson);

  logger.info('TestScraper complete!');
}

if (require.main === module) {
  testScraper().catch((err) => {
    logger.error('Error running test-scraper:', err);
    process.exit(1);
  });
}
