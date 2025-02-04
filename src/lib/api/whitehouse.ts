import { fetchWithSpaw } from './spaw';
import type { ScrapedOrder } from '../scraper/types';
import { determineCategories, determineAgencies } from '../scraper/utils';
import { OrderTypes } from '@/types';
import { logger } from '@/utils/logger';

const WH_URL = 'https://www.whitehouse.gov/briefing-room/presidential-actions/';

export async function fetchExecutiveOrders(): Promise<ScrapedOrder[]> {
  try {
    logger.info('Fetching documents from White House website');
    
    const spawResponse = await fetchWithSpaw({
      url: WH_URL,
      options: {
        waitForSelector: '.briefing-room__card',
        javascript: true
      }
    });
    
    if (!spawResponse.data || !Array.isArray(spawResponse.data)) {
      throw new Error('Invalid response format from White House website');
    }

    logger.info(`Processing ${spawResponse.data.length} documents`);
    
    return spawResponse.data.map(item => {
      // Extract order number from title or metadata
      const orderNumber = item.metadata?.orderNumber || 
        item.title.match(/Executive Order (\d+)/)?.[1] || 
        item.title.match(/Presidential Memorandum[- ](\d+)/)?.[1] || 
        null;

      // Determine type based on content
      const type = item.title.toLowerCase().includes('memorandum') 
        ? OrderTypes.MEMORANDUM 
        : OrderTypes.EXECUTIVE_ORDER;

      // Generate a unique identifier
      const identifier = orderNumber 
        ? `${type === OrderTypes.EXECUTIVE_ORDER ? 'EO' : 'PM'}-${orderNumber}`
        : `${type}-${new Date(item.date).toISOString().split('T')[0]}`;

      return {
        identifier,
        orderNumber,
        type,
        title: item.title,
        date: new Date(item.date),
        url: item.url,
        summary: item.text.split('\n')[0] || null,
        notes: null,
        categories: determineCategories(item.text).map(name => ({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name
        })),
        agencies: determineAgencies(item.text).map(name => ({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name
        })),
        isNew: true
      };
    });
  } catch (error) {
    logger.error('Error fetching executive orders:', error);
    throw error;
  }
}

// Add a helper function to validate document before processing
export function validateDocument(doc: ScrapedOrder): boolean {
  if (!doc.title || !doc.date || !doc.url) {
    logger.warn('Invalid document found:', {
      title: !!doc.title,
      date: !!doc.date,
      url: !!doc.url
    });
    return false;
  }
  return true;
}

// Export types that scheduler needs
export type { ScrapedOrder };