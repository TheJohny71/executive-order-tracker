import { chromium, type Page } from 'playwright';
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

async function scrapeOrdersFromPage(page: Page, url: string): Promise<void> {
  logger.info(`Scraping orders from ${url}`);
  
  try {
    await page.goto(url, { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Add random delay to avoid detection
    await page.waitForTimeout(Math.random() * 2000 + 1000);
    
    const pageContent = await page.content();
    logger.info(`Page content length: ${pageContent.length}`);
    
    if (pageContent.length < 1000) {
      logger.error('Page content suspiciously short');
      await page.screenshot({ path: 'short-content.png', fullPage: true });
      throw new Error('Page content too short - possible bot detection');
    }
    
    const title = await page.title();
    logger.info(`Page title: ${title}`);
    
    await page.waitForSelector('.article-items article, article.briefing-statement', { 
      timeout: 30000,
      state: 'attached'
    });
    
    const articleElements = await page.$$('.article-items article, article.briefing-statement');
    logger.info(`Found ${articleElements.length} articles`);

    if (articleElements.length === 0) {
      logger.error('No articles found - possible selector mismatch');
      await page.screenshot({ path: 'no-articles.png', fullPage: true });
      throw new Error('No articles found on page');
    }

    const orders: RawOrder[] = [];
    
    for (const article of articleElements) {
      try {
        const titleEl = await article.$('h3, h2');
        const dateEl = await article.$('time');
        const linkEl = await article.$('h3 a, h2 a');
        
        const title = await titleEl?.textContent() || '';
        const dateStr = await dateEl?.getAttribute('datetime') || await dateEl?.textContent() || '';
        const href = await linkEl?.getAttribute('href');
        
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
        
        // Add random delay between processing orders
        await page.waitForTimeout(Math.random() * 3000 + 2000);
        
        await page.goto(order.url, { 
          timeout: 30000,
          waitUntil: 'networkidle' 
        });
        
        // Wait for article content
        await page.waitForSelector('article', { timeout: 30000 });
        
        const summary = await page.$eval('article p', 
          (el) => el?.textContent?.trim() || ''
        ).catch(() => '');

        const content = await page.$eval('article', 
          (el) => el?.textContent?.trim() || ''
        ).catch(() => '');

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
        // Continue with next order
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
        : { id: '' }; // Fallback for new non-EO items

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

async function scrapeExecutiveOrders(): Promise<void> {
  await checkDatabaseConnection();
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
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
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

// Auto-execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrapeExecutiveOrders()
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}

// Single export at the end
export { scrapeExecutiveOrders };