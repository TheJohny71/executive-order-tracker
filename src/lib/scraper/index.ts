import { DocumentType, PrismaClient } from '@prisma/client';
import type { ScrapedOrder } from '@/types';
import { logger } from '@/utils/logger';
import axios from 'axios';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

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
  categories: Array<{ name: string }>;
  agencies: Array<{ name: string }>;
}

interface ScraperResult {
  success: boolean;
  ordersScraped: number;
  errors: string[];
  newOrders: ScrapedOrder[];
  updatedOrders: ScrapedOrder[];
}

async function fetchFromAWS(): Promise<ScrapedOrder[]> {
  const endpoint = process.env.AWS_API_ENDPOINT;
  if (!endpoint) {
    throw new Error('AWS_API_ENDPOINT environment variable is not set');
  }

  logger.info(`Fetching data from AWS endpoint: ${endpoint}`);
  
  try {
    const response = await axios.get(endpoint);
    
    logger.info('Raw AWS Response:', {
      status: response.status,
      headers: response.headers,
      data: JSON.stringify(response.data, null, 2)
    });

    if (!response.data) {
      throw new Error('No data received from AWS API');
    }

    // Check the actual structure of response.data
    if (!Array.isArray(response.data)) {
      logger.warn('Response data is not an array:', JSON.stringify(response.data, null, 2));
      // If response.data is wrapped in another object, try to find the array
      if (response.data.items) {
        logger.info('Found items array in response');
        response.data = response.data.items;
      } else if (response.data.data) {
        logger.info('Found data array in response');
        response.data = response.data.data;
      } else if (response.data.orders) {
        logger.info('Found orders array in response');
        response.data = response.data.orders;
      } else if (response.data.body) {
        logger.info('Found body in response, attempting to parse');
        try {
          const bodyData = JSON.parse(response.data.body);
          if (Array.isArray(bodyData)) {
            response.data = bodyData;
          } else if (bodyData.items || bodyData.data || bodyData.orders) {
            response.data = bodyData.items || bodyData.data || bodyData.orders;
          } else {
            throw new Error('Body data is not in expected format');
          }
        } catch (parseError) {
          logger.error('Error parsing body:', parseError);
          throw new Error('Failed to parse response body');
        }
      } else {
        throw new Error('Response data is not in expected format');
      }
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Could not find array data in response');
    }

    logger.info(`Processing ${response.data.length} items from AWS`);

    return response.data.map((item: AWSApiItem): ScrapedOrder => {
      logger.info('Processing item:', JSON.stringify(item, null, 2));
      
      const date = new Date(item.date);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format for item: ${item.identifier}`);
      }

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
        metadata: {
          orderNumber: item.orderNumber || item.identifier,
          categories: item.categories,
          agencies: item.agencies
        }
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
    logger.info('Starting document scraping process');
    
    const documents = await retryWithDelay(() => fetchFromAWS());

    if (documents.length === 0) {
      logger.info('No documents found to process');
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

    logger.info(`Processing ${newOrders.length} new orders and ${updatedOrders.length} updates`);

    // Save new orders to database
    for (const order of newOrders) {
      logger.info(`Creating new order: ${order.title}`);
      await prisma.order.create({
        data: {
          title: order.title,
          type: order.type,
          number: order.metadata?.orderNumber || order.identifier,
          summary: order.summary,
          datePublished: order.date,
          link: order.url,
          status: {
            connect: {
              id: parseInt(order.statusId)
            }
          },
          categories: {
            connectOrCreate: order.categories.map(cat => ({
              where: { name: cat.name },
              create: { name: cat.name }
            }))
          },
          agencies: {
            connectOrCreate: order.agencies.map(agency => ({
              where: { name: agency.name },
              create: { name: agency.name }
            }))
          }
        }
      });
    }

    // Update existing orders
    for (const order of updatedOrders) {
      logger.info(`Updating order: ${order.title}`);
      await prisma.order.updateMany({
        where: {
          OR: [
            { link: order.url },
            { number: order.identifier }
          ]
        },
        data: {
          title: order.title,
          summary: order.summary,
          datePublished: order.date,
          statusId: parseInt(order.statusId)
        }
      });
    }

    logger.info('Document scraping process completed successfully');

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

// Main execution
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  logger.info('Starting scraper execution');
  scrapeDocuments()
    .then(result => {
      logger.info('Scraper execution completed', result);
      process.exit(0);
    })
    .catch(error => {
      logger.error('Scraper execution failed:', error);
      process.exit(1);
    });
}

export const utils = {
  retryWithDelay,
  fetchFromAWS
};