// src/lib/api/whitehouse.ts
import { fetchWithSpaw } from './spaw';
import type { ScrapedOrder } from '../scraper/types';
import { determineCategories, determineAgencies } from '../scraper/utils';
import { OrderTypes } from '@/types';

const WH_URL = 'https://www.whitehouse.gov/briefing-room/presidential-actions/';

export async function fetchExecutiveOrders(): Promise<ScrapedOrder[]> {
  const spawResponse = await fetchWithSpaw({
    url: WH_URL,
    options: {
      waitForSelector: '.briefing-room__card',
      javascript: true
    }
  });
  
  return spawResponse.data.map(item => {
    // Extract order number from title or metadata
    const orderNumber = item.metadata?.orderNumber || 
      item.title.match(/Executive Order (\d+)/)?.[1] || null;

    // Determine type based on content
    const type = item.title.toLowerCase().includes('memorandum') 
      ? OrderTypes.MEMORANDUM 
      : OrderTypes.EXECUTIVE_ORDER;

    return {
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
      }))
    };
  });
}