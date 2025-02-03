import { chromium, type Page } from 'playwright';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';
import { fileURLToPath } from 'url';
import type { ScrapedOrder, RawOrder } from './types';
import { determineCategories, determineAgencies } from './utils';

const logger = pino(pretty({ colorize: true }));
const prisma = new PrismaClient();

const SELECTORS = {
  ARTICLES: [
    '.article-items article',
    'article.briefing-statement',
    '.presidential-actions article',
    '.listing-items article',
    '.post-listing article'
  ],
  TITLE: ['h3', 'h2', '.article-title', '.entry-title'],
  DATE: ['time', '.meta-date', '.post-date', '.entry-date'],
  LINK: ['h3 a', 'h2 a', '.article-title a', '.entry-title a']
};

async function waitForAnySelector(page: Page, selectors: string[], timeout = 30000): Promise<string> {
  const selectorsString = selectors.join(', ');
  try {
    await page.waitForSelector(selectorsString, { timeout });
    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) {
        return selector;
      }
    }
    throw new Error('No matching selector found');
  } catch (error) {
    logger.error(`Failed to find any of these selectors: ${selectorsString}`);
    throw error;
  }
}

async function extractTextContent(element: any, selectors: string[]): Promise<string> {
  for (const selector of selectors) {
    try {
      const el = await element.$(selector);
      if (el) {
        return (await el.textContent() || '').trim();
      }
    } catch (error) {
      continue;
    }
  }
  return '';
}

async function scrapeWithRetry(url: string, maxRetries = 3): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials'
      ]
    });

    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        bypassCSP: true,
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const page = await context.newPage();
      await page.setExtraHTTPHeaders({
        'Referer': 'https://www.google.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      });

      logger.info(`Attempt ${attempt} of ${maxRetries}`);
      await scrapeOrdersFromPage(page, url);
      return;
    } catch (error) {
      lastError = error as Error;
      logger.error(`Attempt ${attempt} failed:`, error);
      await new Promise(resolve => setTimeout(resolve, attempt * 5000));
    } finally {
      await browser.close();
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

async function scrapeOrdersFromPage(page: Page, url: string): Promise<void> {
  logger.info(`Scraping orders from ${url}`);
  
  try {
    await page.goto(url, { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });

    // Random delay between 2-5 seconds
    await page.waitForTimeout(2000 + Math.random() * 3000);

    const pageContent = await page.content();
    logger.info(`Page content length: ${pageContent.length}`);
    
    if (pageContent.length < 1000) {
      await page.screenshot({ path: 'debug/short-content.png', fullPage: true });
      throw new Error('Page content too short - possible bot detection');
    }

    const title = await page.title();
    logger.info(`Page title: ${title}`);

    // Try each article selector until one works
    const articleSelector = await waitForAnySelector(page, SELECTORS.ARTICLES);
    const articleElements = await page.$$(articleSelector);
    logger.info(`Found ${articleElements.length} articles using selector: ${articleSelector}`);

    if (articleElements.length === 0) {
      await page.screenshot({ path: 'debug/no-articles.png', fullPage: true });
      throw new Error('No articles found on page');
    }

    const orders: RawOrder[] = [];
    
    for (const article of articleElements) {
      try {
        const title = await extractTextContent(article, SELECTORS.TITLE);
        const dateStr = await extractTextContent(article, SELECTORS.DATE);
        const href = await article.$eval(SELECTORS.LINK[0], (el: any) => el.getAttribute('href'))
          .catch(() => null);
        
        if (title && dateStr && href) {
          const isEO = title.toLowerCase().includes('executive order');
          const type = isEO ? 'Executive Order' : 'Memorandum';
          const orderNumber = isEO ? title.match(/Executive Order (\d+)/)?.[1] : undefined;
          const date = new Date(dateStr);
          
          if (!isNaN(date.getTime()) && date.getFullYear() >= 2025) {
            const fullUrl = href.startsWith('http') ? href : `https://www.whitehouse.gov${href}`;
            orders.push({
              type,
              orderNumber,
              title: title.trim(),
              date: dateStr,
              url: fullUrl
            });
          }
        }
      } catch (error) {
        logger.error('Error extracting article data:', error);
      }
    }

    logger.info(`Found ${orders.length} orders from 2025 onwards`);

    for (const order of orders) {
      try {
        logger.info(`Processing order: ${order.title}`);
        await page.waitForTimeout(2000 + Math.random() * 3000);
        
        await page.goto(order.url, { 
          timeout: 30000,
          waitUntil: 'networkidle' 
        });
        
        await page.waitForSelector('article', { timeout: 30000 });
        
        const summary = await page.$eval('article p', el => el.textContent?.trim() || '')
          .catch(() => '');

        const content = await page.$eval('article', el => el.textContent?.trim() || '')
          .catch(() => '');

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
          summary,
          agencies: determineAgencies(content),
          categories: determineCategories(content)
        };

        await saveOrder(scrapedOrder);
        logger.info({ 
          title: order.title,
          agencies: scrapedOrder.agencies.length,
          categories: scrapedOrder.categories.length
        }, 'Processed order successfully');
      } catch (error) {
        logger.error({ error, order }, 'Error processing individual order');
      }
    }
  } catch (error) {
    logger.error('Error in scrapeOrdersFromPage:', error);
    throw error;
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

async function checkDatabaseConnection(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

async function scrapeExecutiveOrders(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Starting presidential actions scrape');
    await scrapeWithRetry('https://www.whitehouse.gov/briefing-room/presidential-actions/');
    logger.info('Completed presidential actions scrape');
  } catch (error) {
    logger.error('Error scraping presidential actions:', error instanceof Error ? error.stack : error);
    throw error;
  } finally {
    await prisma.$disconnect();
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