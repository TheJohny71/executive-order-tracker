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

const getPdfUrl = (identifier: string) => `${BASE_ACTIONS_URL}/${identifier}/download`;

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
    
    return spawResponse.data.map(item => {
      const orderNumberMatch = item.title.match(/Executive Order (\d+)/)?.[1] || 
                             item.title.match(/Presidential Memorandum[- ](\d+)/)?.[1];

      const type = item.title.toLowerCase().includes('memorandum') 
        ? DocumentType.MEMORANDUM 
        : DocumentType.EXECUTIVE_ORDER;

      const identifier = orderNumberMatch 
        ? `${type === DocumentType.EXECUTIVE_ORDER ? 'EO' : 'PM'}-${orderNumberMatch}`
        : `${type}-${new Date(item.date).toISOString().split('T')[0]}`;

      const documentUrl = getDocumentUrl(type, identifier);

      return {
        identifier,
        type,
        title: item.title,
        date: new Date(item.date),
        url: documentUrl,
        pdfUrl: getPdfUrl(identifier),
        summary: item.text?.split('\n')[0] || null,
        notes: null,
        content: item.text || null,
        statusId: 'default-status-id',
        categories: determineCategories(item.text).map(name => ({ name })),
        agencies: determineAgencies(item.text).map(name => ({ name })),
        isNew: true,
        metadata: {
          orderNumber: orderNumberMatch || null,
          citations: [],
          amendments: []
        }
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

export const whiteHouseApi = {
  fetchExecutiveOrders,
  validateDocument
};