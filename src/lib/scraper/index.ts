import { chromium, type Page } from 'playwright';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';
import fetch from 'node-fetch';
import type { ScrapedOrder, RawOrder } from './types';
import { determineCategories, determineAgencies } from './utils';

const logger = pino(pretty({ colorize: true }));
const prisma = new PrismaClient();

const RSS_URL = 'https://www.whitehouse.gov/feed/';
const BACKUP_URL = 'https://www.federalregister.gov/api/v1/documents.json?conditions[type]=PRESDOCU';

interface FederalRegisterResponse {
  results: Array<{
    presidential_document_type: string;
    executive_order_number?: string;
    title: string;
    publication_date: string;
    html_url: string;
    body?: string;
    abstract?: string;
  }>;
}

interface FederalRegisterDocument {
  body?: string;
  abstract?: string;
}

interface XMLItem {
  title: string;
  link: string;
  pubDate: string;
  category: string | string[];
}

interface XMLResponse {
  rss: {
    channel: {
      item: XMLItem | XMLItem[];
    };
  };
}

async function fetchRSSFeed(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(RSS_URL, {
      headers: {
        'User-Agent': 'RSS Reader/1.0',
        'Accept': 'application/rss+xml,application/xml;q=0.9',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  } catch (error: unknown) {
    logger.warn('RSS feed failed, trying Federal Register API', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(BACKUP_URL, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Backup API failed! status: ${response.status}`);
      }
      return await response.text();
    } catch (backupError: unknown) {
      throw new Error(
        `Both primary and backup feeds failed: ${
          backupError instanceof Error ? backupError.message : String(backupError)
        }`
      );
    }
  }
}

async function parseRSSContent(content: string, isBackup = false): Promise<RawOrder[]> {
  const orders: RawOrder[] = [];
  
  if (isBackup) {
    try {
      const data = JSON.parse(content) as FederalRegisterResponse;
      return data.results.map((item) => ({
        type: item.presidential_document_type === 'executive_order' ? 'Executive Order' : 'Memorandum',
        orderNumber: item.executive_order_number,
        title: item.title,
        date: item.publication_date,
        url: item.html_url,
        apiUrl: `${item.html_url}.json`,
        content: item.body || item.abstract
      }));
    } catch (error: unknown) {
      logger.error('Error parsing backup JSON:', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: true,
    trimValues: true
  });
  
  try {
    const result = parser.parse(content) as XMLResponse;
    const items = result.rss?.channel?.item;
    
    if (!items) {
      throw new Error('No items found in RSS feed');
    }

    for (const item of Array.isArray(items) ? items : [items]) {
      const title = item.title;
      const category = item.category;
      
      if (Array.isArray(category) ? category.includes('Presidential Actions') : category === 'Presidential Actions') {
        const isEO = title.toLowerCase().includes('executive order');
        const type = isEO ? 'Executive Order' : 'Memorandum';
        const orderNumber = isEO ? title.match(/Executive Order (\d+)/)?.[1] : undefined;
        const date = new Date(item.pubDate);
        
        if (date.getFullYear() >= 2025) {
          orders.push({
            type,
            orderNumber,
            title: title.trim(),
            date: item.pubDate,
            url: item.link
          });
        }
      }
    }
  } catch (error: unknown) {
    logger.error('Error parsing RSS content:', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
  
  return orders;
}

async function scrapeOrderContent(page: Page, url: string, apiUrl?: string): Promise<string> {
  try {
    if (url.includes('federalregister.gov')) {
      // Try API first if available
      if (apiUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          const response = await fetch(apiUrl, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json() as FederalRegisterDocument;
            if (data.body || data.abstract) {
              return data.body || data.abstract || '';
            }
          }
        } catch (error: unknown) {
          logger.warn('API fetch failed, falling back to page scraping', {
            error: error instanceof Error ? error.message : String(error),
            url: apiUrl
          });
        }
      }
      
      // Fall back to page scraping
      await page.goto(url, { 
        timeout: 30000,
        waitUntil: 'networkidle'
      });
      
      // Try multiple possible selectors for Federal Register
      const selectors = [
        '.document-content',
        '#fulltext_content_area',
        '.body-content'
      ];
      
      for (const selector of selectors) {
        try {
          const content = await page.$eval(selector, el => el.textContent || '');
          if (content) {
            return content;
          }
        } catch {
          continue;
        }
      }
      
      logger.warn('No matching selectors found for Federal Register page', { url });
      return '';
      
    } else {
      // White House website
      await page.goto(url, { 
        timeout: 30000,
        waitUntil: 'networkidle'
      });
      
      const content = await page.$eval('article', el => el.textContent || '')
        .catch(() => '');
        
      return content;
    }
  } catch (error: unknown) {
    logger.error('Error scraping order content:', { 
      error: error instanceof Error ? error.message : String(error),
      url 
    });
    return '';
  }
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
    
    const isBackup = rssContent.includes('"results":');
    const orders = await parseRSSContent(rssContent, isBackup);
    logger.info(`Found ${orders.length} orders in ${isBackup ? 'Federal Register' : 'RSS feed'}`);
    
    for (const order of orders) {
      try {
        const content = await scrapeOrderContent(page, order.url, order.apiUrl);
        
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
      } catch (error: unknown) {
        logger.error('Error processing individual order:', { 
          error: error instanceof Error ? error.message : String(error),
          order 
        });
      }
    }
    
    logger.info('Completed presidential actions scrape');
  } catch (error: unknown) {
    logger.error('Error scraping presidential actions:', { 
      error: error instanceof Error ? error.message : String(error) 
    });
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
  } catch (error: unknown) {
    logger.error('Error saving order:', { 
      error: error instanceof Error ? error.message : String(error),
      orderTitle: order.title,
      orderNumber: order.orderNumber,
      url: order.url 
    });
    throw error;
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrapeExecutiveOrders()
    .catch((error: unknown) => {
      logger.error('Fatal error:', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      process.exit(1);
    });
}

export { scrapeExecutiveOrders };