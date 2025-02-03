import { chromium, type Page } from 'playwright';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';
import { fileURLToPath } from 'url';
import type { ScrapedOrder, RawOrder } from './types';
import { determineCategories, determineAgencies } from './utils';

const logger = pino(pretty({ colorize: true }));
const prisma = new PrismaClient();

const RSS_URL = 'https://www.whitehouse.gov/feed/';

async function fetchRSSFeed(): Promise<string> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'RSS Reader/1.0',
    extraHTTPHeaders: {
      'Accept': 'application/rss+xml,application/xml;q=0.9',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  });

  const page = await context.newPage();
  
  try {
    const response = await page.goto(RSS_URL, {
      timeout: 30000,
      waitUntil: 'networkidle'
    });

    if (!response) {
      throw new Error('No response received');
    }

    const content = await response.text();
    return content;
  } finally {
    await browser.close();
  }
}

async function parseRSSContent(content: string): Promise<RawOrder[]> {
  const orders: RawOrder[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');
  
  const items = doc.querySelectorAll('item');
  
  for (const item of items) {
    const title = item.querySelector('title')?.textContent || '';
    const link = item.querySelector('link')?.textContent || '';
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const category = item.querySelector('category')?.textContent || '';
    
    if (category.includes('Presidential Actions')) {
      const isEO = title.toLowerCase().includes('executive order');
      const type = isEO ? 'Executive Order' : 'Memorandum';
      const orderNumber = isEO ? title.match(/Executive Order (\d+)/)?.[1] : undefined;
      const date = new Date(pubDate);
      
      if (date.getFullYear() >= 2025) {
        orders.push({
          type,
          orderNumber,
          title: title.trim(),
          date: pubDate,
          url: link
        });
      }
    }
  }
  
  return orders;
}

async function scrapeOrderContent(page: Page, url: string): Promise<string> {
  await page.goto(url, { 
    timeout: 30000,
    waitUntil: 'networkidle'
  });
  
  const content = await page.$eval('article', el => el.textContent || '')
    .catch(() => '');
    
  return content;
}

async function scrapeExecutiveOrders(): Promise<void> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0',
  });
  
  const page = await context.newPage();
  
  try {
    await prisma.$connect();
    logger.info('Starting presidential actions scrape');
    
    const rssContent = await fetchRSSFeed();
    logger.info('RSS feed fetched successfully');
    
    const orders = await parseRSSContent(rssContent);
    logger.info(`Found ${orders.length} orders in RSS feed`);
    
    for (const order of orders) {
      try {
        const content = await scrapeOrderContent(page, order.url);
        
        if (!content) {
          logger.warn({ url: order.url }, 'No content found for order');
          continue;
        }
        
        const scrapedOrder: ScrapedOrder = {
          type: order.type,
          orderNumber: order.orderNumber,
          title: order.title,
          date: new Date(order.date),
          url: order.url,
          summary: content.split('\n')[0]?.trim() || '',
          agencies: determineAgencies(content),
          categories: determineCategories(content)
        };
        
        await saveOrder(scrapedOrder);
        logger.info({ title: order.title }, 'Processed order successfully');
        
        // Add delay between requests
        await page.waitForTimeout(2000 + Math.random() * 3000);
      } catch (error) {
        logger.error({ error, order }, 'Error processing individual order');
      }
    }
    
    logger.info('Completed presidential actions scrape');
  } catch (error) {
    logger.error('Error scraping presidential actions:', error);
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

async function saveOrder(order: ScrapedOrder): Promise<void> {
  try {
    const categoryConnects = await Promise.all(
      order.categories.map(async (name) => {
        const category = await prisma.category.upsert({
          where: { name },
          create: { name },
          update: {}
        });
        return { id: category.id };
      })
    );

    const agencyConnects = await Promise.all(
      order.agencies.map(async (name) => {
        const agency = await prisma.agency.upsert({
          where: { name },
          create: { name },
          update: {}
        });
        return { id: agency.id };
      })
    );

    const existingOrder = order.orderNumber
      ? await prisma.executiveOrder.findUnique({ where: { orderNumber: order.orderNumber } })
      : await prisma.executiveOrder.findFirst({ where: { url: order.url } });

    const where = existingOrder
      ? { id: existingOrder.id }
      : order.orderNumber
        ? { orderNumber: order.orderNumber }
        : { id: '' };

    await prisma.executiveOrder.upsert({
      where,
      create: {
        type: order.type,
        orderNumber: order.orderNumber,
        title: order.title,
        date: order.date,
        url: order.url,
        summary: order.summary,
        categories: { connect: categoryConnects },
        agencies: { connect: agencyConnects }
      },
      update: {
        title: order.title,
        summary: order.summary,
        categories: { set: [], connect: categoryConnects },
        agencies: { set: [], connect: agencyConnects }
      }
    });

    logger.info({ 
      title: order.title,
      orderNumber: order.orderNumber 
    }, 'Saved order successfully');
  } catch (error) {
    logger.error({ 
      error, 
      orderTitle: order.title,
      orderNumber: order.orderNumber,
      url: order.url 
    }, 'Error saving order');
    throw error;
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrapeExecutiveOrders()
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}

export { scrapeExecutiveOrders };