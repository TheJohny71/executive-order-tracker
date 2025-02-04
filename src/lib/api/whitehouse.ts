// src/lib/api/whitehouse.ts

import { DocumentType } from '@prisma/client';
import { fetchWithSpaw } from './spaw';
import type { ScrapedOrder } from '@/types';
import { determineCategories, determineAgencies } from '../scraper/utils';
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
        ? DocumentType.MEMORANDUM 
        : DocumentType.EXECUTIVE_ORDER;

      // Generate a unique identifier
      const identifier = orderNumber 
        ? `${type === DocumentType.EXECUTIVE_ORDER ? 'EO' : 'PM'}-${orderNumber}`
        : `${type}-${new Date(item.date).toISOString().split('T')[0]}`;

      return {
        identifier,
        type,
        title: item.title,
        date: new Date(item.date),
        url: item.url,
        summary: item.text.split('\n')[0] || null,
        notes: null,
        content: item.text || null,
        statusId: 'default-status-id', // You'll need to set this based on your status table
        categories: determineCategories(item.text).map(name => ({
          name
        })),
        agencies: determineAgencies(item.text).map(name => ({
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

export function validateDocument(doc: ScrapedOrder): boolean {
  if (!doc.title || !doc.date || !doc.url || !doc.identifier || !doc.type) {
    logger.warn('Invalid document found:', {
      title: !!doc.title,
      date: !!doc.date,
      url: !!doc.url,
      identifier: !!doc.identifier,
      type: !!doc.type
    });
    return false;
  }
  return true;
}