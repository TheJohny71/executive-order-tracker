import { DocumentType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';
import type { ScrapedOrder } from '@/types';
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.whitehouse.gov/briefing-room/presidential-actions/';
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, attempts = RETRY_ATTEMPTS): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ExecutiveOrderTracker/1.0)',
      }
    });
    return response.data;
  } catch (error) {
    if (attempts > 1) {
      logger.warn(`Retrying fetch for ${url}. Attempts left: ${attempts - 1}`);
      await delay(RETRY_DELAY);
      return fetchWithRetry(url, attempts - 1);
    }
    throw error;
  }
}

function extractOrderNumber(title: string): string {
  const match = title.match(/Executive Order (\d+)/i);
  return match ? match[1] : title;
}

function determineDocumentType(title: string): DocumentType {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('executive order')) {
    return DocumentType.EXECUTIVE_ORDER;
  } else if (lowerTitle.includes('memorandum')) {
    return DocumentType.MEMORANDUM;
  } else if (lowerTitle.includes('proclamation')) {
    return DocumentType.PROCLAMATION;
  }
  return DocumentType.EXECUTIVE_ORDER;
}

function parseDate(dateStr: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  return date;
}

interface OrderDetails {
  content: string;
  agencies: Array<{ name: string }>;
  categories: Array<{ name: string }>;
}

async function extractOrderDetails(url: string): Promise<OrderDetails> {
  try {
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);

    const content = $('.body-content').text().trim();
    const agencies: Array<{ name: string }> = [];
    const categories: Array<{ name: string }> = [];

    // Extract agencies and categories from content
    if (content.includes('Department of')) {
      const deptMatch = content.match(/Department of [A-Za-z]+/);
      if (deptMatch) {
        agencies.push({ name: deptMatch[0] });
      }
    }

    return {
      content,
      agencies,
      categories,
    };
  } catch (error) {
    logger.error(`Error extracting order details from ${url}:`, error);
    return {
      content: '',
      agencies: [],
      categories: []
    };
  }
}

export async function scrapeExecutiveOrders() {
  try {
    logger.info('Starting executive orders scrape');
    const html = await fetchWithRetry(BASE_URL);
    const $ = cheerio.load(html);
    const orders: ScrapedOrder[] = [];

    // Select the container that holds all presidential actions
    $('.presidential-actions article').each((_, element) => {
      try {
        const $element = $(element);
        const title = $element.find('h3').text().trim();
        const dateText = $element.find('time').attr('datetime');
        const url = $element.find('a').attr('href');
        const summary = $element.find('.presidential-action-content').text().trim();

        if (!dateText || !url) {
          logger.warn('Missing required fields for article:', title);
          return;
        }

        const type = determineDocumentType(title);
        const date = parseDate(dateText);
        const identifier = type === DocumentType.EXECUTIVE_ORDER ? 
          extractOrderNumber(title) : 
          title;

        if (date >= new Date('2025-01-01')) {
          orders.push({
            identifier,
            type,
            title,
            date,
            url,
            summary,
            content: '',
            notes: '',
            statusId: '1', // Assuming 1 is 'Active'
            isNew: true,
            categories: [],
            agencies: [],
            metadata: {
              orderNumber: type === DocumentType.EXECUTIVE_ORDER ? extractOrderNumber(title) : undefined,
              categories: [],
              agencies: []
            }
          });
        }
      } catch (error) {
        logger.error('Error processing article element:', error);
      }
    });

    // Fetch additional details for each order
    for (const order of orders) {
      const details = await extractOrderDetails(order.url);
      order.content = details.content;
      order.agencies = details.agencies;
      order.categories = details.categories;
    }

    // Store in database
    for (const order of orders) {
      try {
        const existingOrder = await prisma.order.findFirst({
          where: {
            OR: [
              { number: order.metadata?.orderNumber },
              { title: order.title }
            ]
          }
        });

        if (!existingOrder) {
          await prisma.order.create({
            data: {
              title: order.title,
              type: order.type,
              number: order.metadata?.orderNumber || null,
              summary: order.summary,
              datePublished: order.date,
              link: order.url,
              status: {
                connect: {
                  id: 1 // Active status
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
          logger.info(`Created new order: ${order.title}`);
        }
      } catch (error) {
        logger.error(`Error storing order ${order.title}:`, error);
      }
    }

    return {
      success: true,
      message: `Successfully processed ${orders.length} orders`,
      data: orders
    };

  } catch (error) {
    logger.error('Error in scrapeExecutiveOrders:', error);
    return {
      success: false,
      message: 'Failed to scrape executive orders',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}