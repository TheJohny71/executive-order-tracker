import { config } from '../utils/config';
import { logger } from '../utils/logger';

async function testScraper() {
  logger.info('Starting testScraper...', { BASE_URL: config.BASE_URL });
  
  try {
    const url = `${config.BASE_URL}/api/scrape`;
    logger.info('Requesting:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    logger.info('Scraper response:', data);
    return data;
  } catch (error) {
    logger.error('Error running test-scraper:', error);
    throw error;
  }
}

testScraper().catch((error) => {
  process.exit(1);
});
