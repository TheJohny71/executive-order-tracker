import { DocumentType, PrismaClient } from '@prisma/client';
import type { ScrapedOrder } from '@/types';
import { logger } from '@/utils/logger';
import axios from 'axios';

const prisma = new PrismaClient();

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

interface AWSApiItem {
  identifier: string;
  id?: string;
  type: DocumentType;
  title: string;
  date: string;
  url: string;
  summary: string;
  notes?: string | null;
  content?: string | null;
  statusId: string;
  orderNumber?: string | null;
  categories?: Array<{ name: string }> | null;
  agencies?: Array<{ name: string }> | null;
}

interface ScraperResult {
  success: boolean;
  ordersScraped: number;
  errors: string[];
  newOrders: ScrapedOrder[];
  updatedOrders: ScrapedOrder[];
}

interface ScrapedOrderMetadata {
  orderNumber: string;
  categories: Array<{ name: string }> | null;
  agencies: Array<{ name: string }> | null;
}

async function fetchFromAWS(): Promise<ScrapedOrder[]> {
  const endpoint = process.env.AWS_API_ENDPOINT;
  if (!endpoint) {
    throw new Error('AWS_API_ENDPOINT environment variable is not set');
  }

  try {
    const response = await axios.get<AWSApiItem[]>(endpoint);
    
    if (!response.data) {
      throw new Error('No data received from AWS API');
    }

    return response.data.map((item: AWSApiItem): ScrapedOrder => {
      const date = new Date(item.date);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format for item: ${item.identifier}`);
      }

      const metadata: ScrapedOrderMetadata = {
        orderNumber: item.orderNumber || item.identifier,
        categories: item.categories || null,
        agencies: item.agencies || null
      };

      return {
        identifier: item.identifier || item.id || '',
        type: item.type,
        title: item.title || 'Untitled',
        date,
        url: item.url,
        summary: item.summary || '',
        notes: item.notes || null,
        content: item.content || null,
        statusId: item.statusId || '1',
        isNew: true,
        categories: item.categories || [],
        agencies: item.agencies || [],
        metadata
      };
    });
  } catch (error) {
    logger.error('Error fetching from AWS:', error);
    throw error;
  }
}

async function retryWithDelay<T>(
  fn: () => Promise<T>, 
  retries = MAX_RETRIES
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Retrying operation in ${RETRY_DELAY}ms. Retries left: ${retries - 1}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return retryWithDelay(fn, retries - 1);
    }
    throw error;
  }
}

export async function scrapeDocuments(): Promise<ScraperResult> {
  try {
    const documents = await retryWithDelay(() => fetchFromAWS());

    if (documents.length === 0) {
      return {
        success: true,
        ordersScraped: 0,
        errors: [],
        newOrders: [],
        updatedOrders: []
      };
    }

    logger.info(`Found ${documents.length} documents`);

    const existingOrders = await prisma.order.findMany({
      select: { 
        link: true,
        number: true 
      }
    });
    
    const existingLinks = new Set(existingOrders.map(o => o.link).filter(Boolean));
    const existingNumbers = new Set(existingOrders.map(o => o.number).filter(Boolean));

    const newOrders: ScrapedOrder[] = [];
    const updatedOrders: ScrapedOrder[] = [];

    documents.forEach(doc => {
      if (!existingLinks.has(doc.url) && !existingNumbers.has(doc.identifier)) {
        newOrders.push(doc);
      } else {
        updatedOrders.push(doc);
      }
    });

    return {
      success: true,
      ordersScraped: documents.length,
      errors: [],
      newOrders,
      updatedOrders
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error scraping documents:', error);
    return {
      success: false,
      ordersScraped: 0,
      errors: [errorMessage],
      newOrders: [],
      updatedOrders: []
    };
  }
}

export async function checkForNewDocuments(): Promise<ScrapedOrder[]> {
  try {
    const latestDocuments = await retryWithDelay(() => fetchFromAWS());
    
    const existingOrders = await prisma.order.findMany({
      select: { 
        link: true,
        number: true 
      }
    });
    
    const existingLinks = new Set(existingOrders.map(o => o.link).filter(Boolean));
    const existingNumbers = new Set(existingOrders.map(o => o.number).filter(Boolean));
    
    return latestDocuments.filter(doc => 
      !existingLinks.has(doc.url) && !existingNumbers.has(doc.identifier)
    );
  } catch (error) {
    logger.error('Error checking for new documents:', error);
    throw error;
  }
}

export const utils = {
  retryWithDelay,
  fetchFromAWS
};