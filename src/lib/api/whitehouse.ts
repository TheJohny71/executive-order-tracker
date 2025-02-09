// src/lib/api/whitehouse.ts
import { DocumentType } from '@prisma/client';
import { fetchWithSpaw } from './spaw';
import type { ScrapedOrder } from '@/types';
import { determineCategories, determineAgencies } from '../scraper/utils';
import { logger } from '@/utils/logger';

const WH_URL = 'https://www.whitehouse.gov';
const BASE_ACTIONS_URL = `${WH_URL}/briefing-room/presidential-actions`;

const getDocumentUrl = (type: DocumentType, identifier: string) => {
  const path = type === DocumentType.EXECUTIVE_ORDER ? 'presidential-actions' : 'briefing-room';
  return `${WH_URL}/briefing-room/${path}/${identifier}`;
};

export const getPdfUrl = (identifier: string) => `${BASE_ACTIONS_URL}/${identifier}/download`;

export async function fetchExecutiveOrders(): Promise<ScrapedOrder[]> {
  try {
    logger.info('Fetching documents from White House website');
    
    const spawResponse = await fetchWithSpaw({
      url: BASE_ACTIONS_URL,
      options: {
        waitForSelector: '.briefing-room__card',
        javascript: true
      }
    });
    
    if (!spawResponse.data || !Array.isArray(spawResponse.data)) {
      throw new Error('Invalid response format from White House website');
    }

    logger.info(`Processing ${spawResponse.data.length} documents`);
    
    const validDocuments: ScrapedOrder[] = [];
    
    for (const item of spawResponse.data) {
      try {
        const orderNumberMatch = item.title.match(/Executive Order (\d+)/)?.[1] || 
                               item.title.match(/Presidential Memorandum[- ](\d+)/)?.[1];

        const type = item.title.toLowerCase().includes('memorandum') 
          ? DocumentType.MEMORANDUM 
          : DocumentType.EXECUTIVE_ORDER;

        const identifier = orderNumberMatch 
          ? `${type === DocumentType.EXECUTIVE_ORDER ? 'EO' : 'PM'}-${orderNumberMatch}`
          : `${type}-${new Date(item.date).toISOString().split('T')[0]}`;

        const documentUrl = getDocumentUrl(type, identifier);
        
        const categories = determineCategories(item.text).map(name => ({ name }));
        const agencies = determineAgencies(item.text).map(name => ({ name }));

        const doc: ScrapedOrder = {
          type,
          identifier,
          title: item.title,
          summary: item.text?.split('\n')[0] || 'No summary available', // Fixed undefined issue
          date: new Date(item.date),
          url: documentUrl,
          content: item.text || null,
          notes: null,
          statusId: 'active',
          categories,
          agencies,
          isNew: true,
          metadata: {
            orderNumber: orderNumberMatch || undefined,
            categories,
            agencies
          }
        };

        if (validateDocument(doc)) {
          validDocuments.push(doc);
        }
      } catch (error) {
        logger.error('Error processing document:', { title: item.title, error });
      }
    }
    
    return validDocuments;
  } catch (error) {
    logger.error('Error fetching executive orders:', error);
    throw error;
  }
}

export function validateDocument(doc: ScrapedOrder): boolean {
  if (!doc.title || !doc.date || !doc.url || !doc.type || !doc.identifier) {
    logger.warn('Invalid document found:', {
      title: !!doc.title,
      date: !!doc.date,
      url: !!doc.url,
      type: !!doc.type,
      identifier: !!doc.identifier
    });
    return false;
  }
  return true;
}

export const whiteHouseApi = {
  fetchExecutiveOrders,
  validateDocument,
  getPdfUrl
};