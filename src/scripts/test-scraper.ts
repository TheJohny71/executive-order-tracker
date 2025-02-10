import { apiConfig } from '@/config/api.config';
import { logger } from '@/utils/logger';

async function testScraper() {
  logger.info('Starting testScraper...', { baseUrl: apiConfig.aws.apiUrl });
  
  try {
    const url = `${apiConfig.aws.apiUrl}/api/scrape`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.info('Scraper response:', data);
    return data;
  } catch (err) {
    logger.error('Error running test-scraper', err);
    process.exit(1);
  }
}

testScraper();
