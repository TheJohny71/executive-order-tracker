// src/lib/scraper/index.ts
import { DocumentType, PrismaClient } from '@prisma/client';
import type { ScrapedOrder } from '@/types';
import { logger } from '@/utils/logger';
import axios from 'axios';

const prisma = new PrismaClient();

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

// Define ScraperResult interface here since it's specific to the scraper
interface ScraperResult {
  success: boolean;
  ordersScraped: number;
  errors: string[];
  newOrders: ScrapedOrder[];
  updatedOrders: ScrapedOrder[];
}

/**
 * Fetches executive orders from AWS API
 * @returns Promise<ScrapedOrder[]>
 */
async function fetchFromAWS(): Promise<ScrapedOrder[]> {
  if (!process.env.AWS_API_ENDPOINT) {
    throw new Error('AWS_API_ENDPOINT environment variable is not set');
  }

  try {
    const response = await axios.get(process.env.AWS_API_ENDPOINT);
    
    if (!response.data) {
      throw new Error('No data received from AWS API');
    }

    // Transform the AWS response to match ScrapedOrder type
    return response.data.map((item: any): ScrapedOrder => ({
      identifier: item.identifier || item.id || '',
      type: (item.type as DocumentType) || DocumentType.EXECUTIVE_ORDER,
      title: item.title || 'Untitled',
      date: new Date(item.date),
      url: item.url,
      summary: item.summary || '',
      notes: item.notes || null,
      content: item.content || null,
      statusId: String(item.statusId || '1'),
      isNew: true,
      categories: item.categories?.map((cat: any) => ({ name: cat.name })) || [],
      agencies: item.agencies?.map((agency: any) => ({ name: agency.name })) || [],
      metadata: {
        orderNumber: item.orderNumber || item.identifier,
        categories: item.categories,
        agencies: item.agencies
      }
    }));
  } catch (error) {
    logger.error('Error fetching from AWS:', error);
    throw error;
  }
}

/**
 * Retry mechanism for API calls
 */
async function retryWithDelay<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
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

/**
 * Main function to scrape documents
 * @returns Promise<ScraperResult>
 */
export async function scrapeDocuments(): Promise<ScraperResult> {
  try {
    const documents: ScrapedOrder[] = await retryWithDelay(() => fetchFromAWS());

    if (documents.length === 0) {
      logger.warn('No documents found');
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
    
    const existingLinks = new Set(existingOrders.map(o => o.link));
    const existingNumbers = new Set(existingOrders.map(o => o.number));

    const newOrders: ScrapedOrder[] = [];
    const updatedOrders: ScrapedOrder[] = [];

    for (const doc of documents) {
      if (!existingLinks.has(doc.url) && !existingNumbers.has(doc.identifier)) {
        newOrders.push(doc);
      } else {
        updatedOrders.push(doc);
      }
    }

    logger.info(`Found ${newOrders.length} new and ${updatedOrders.length} updated documents`);

    return {
      success: true,
      ordersScraped: documents.length,
      errors: [],
      newOrders,
      updatedOrders
    };

  } catch (error) {
    logger.error('Error scraping documents:', error);
    return {
      success: false,
      ordersScraped: 0,
      errors: [(error as Error).message],
      newOrders: [],
      updatedOrders: []
    };
  }
}

/**
 * Check for new documents since last check
 * @returns Promise<ScrapedOrder[]>
 */
export async function checkForNewDocuments(): Promise<ScrapedOrder[]> {
  try {
    const latestDocuments: ScrapedOrder[] = await retryWithDelay(() => fetchFromAWS());
    
    const existingOrders = await prisma.order.findMany({
      select: { 
        link: true,
        number: true 
      }
    });
    
    const existingLinks = new Set(existingOrders.map(o => o.link));
    const existingNumbers = new Set(existingOrders.map(o => o.number));
    
    const newDocuments = latestDocuments.filter((doc: ScrapedOrder) => {
      return !existingLinks.has(doc.url) && !existingNumbers.has(doc.identifier);
    });

    if (newDocuments.length > 0) {
      logger.info(`Found ${newDocuments.length} new documents`);
    }

    return newDocuments;
  } catch (error) {
    logger.error('Error checking for new documents:', error);
    throw error;
  }
}

// Export any additional utility functions if needed
export const utils = {
  retryWithDelay,
  fetchFromAWS
};