import { chromium, type Page, type ElementHandle } from 'playwright';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';
import { fileURLToPath } from 'url';
import type { ScrapedOrder, RawOrder } from './types';
import { determineCategories, determineAgencies } from './utils';

const logger = pino(pretty({ colorize: true }));
const prisma = new PrismaClient();

async function checkDatabaseConnection(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

export async function scrapeExecutiveOrders(): Promise<void> {
  await checkDatabaseConnection();
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  
  const page = await context.newPage();
  
  try {
    logger.info('Starting presidential actions scrape');
    await scrapeOrdersFromPage(page, 'https://www.whitehouse.gov/briefing-room/presidential-actions/');
    logger.info('Completed presidential actions scrape');
  } catch (error) {
    logger.error('Error scraping presidential actions:', error instanceof Error ? error.stack : error);
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

async function scrapeOrdersFromPage(page: Page, url: string): Promise<void> {
  logger.info(`Scraping orders from ${url}`);
  
  try {
    await page.goto(url, { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    const pageContent = await page.content();
    logger.info(`Page content length: ${pageContent.length}`);
    
    if (pageContent.length < 1000) {
      throw new Error('Page content too short - possible bot detection');
    }
    
    const title = await page.title();
    logger.info(`Page title: ${title}`);
    
    await page.waitForSelector('.listing-items article, article.briefing-statement', { timeout: 30000 });
    
    const articleElements = await page.$$('article');
    logger.info(`Found ${articleElements.length} articles`);

    const orders: RawOrder[] = [];
    
    for (const article of articleElements) {
      const titleEl = await article.$('h2');
      const dateEl = await article.$('time, .meta-date');
      const linkEl = await article.$('a');
      
      const title = await titleEl?.textContent() || '';
      const dateStr = await dateEl?.getAttribute('datetime') || await dateEl?.textContent() || '';
      const href = await linkEl?.getAttribute('href');
      
      if (title && dateStr && href) {
        const isEO = title.toLowerCase().includes('executive order');
        const type = isEO ? 'Executive Order' : 'Memorandum';
        const orderNumber = isEO ? title.match(/Executive Order (\d+)/)?.[1] : undefined;
        const date = new Date(dateStr);
        
        if (date.getFullYear() >= 2025) {
          orders.push({
            type,
            orderNumber,
            title,
            date: dateStr,
            url: href
          });
        }
      }
    }

    logger.info(`Found ${orders.length} orders from 2025 onwards`);

    for (const order of orders) {
      try {
        await page.goto(order.url, { timeout: 30000 });
        
        const summary = await page.$eval('article p', 
          (el) => el?.textContent?.trim() || ''
        ).catch(() => '');

        const content = await page.$eval('article', 
          (el) => el?.textContent?.trim() || ''
        ).catch(() => '');

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
        logger.info({ title: order.title }, 'Processed order');
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

    logger.info({ title: order.title }, 'Saved order successfully');
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrapeExecutiveOrders()
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}