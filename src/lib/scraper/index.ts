import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';
import type { ScrapedOrder } from './types';
import { determineCategories, determineAgencies, retry } from './utils';

const logger = pino(pretty({ colorize: true }));
const prisma = new PrismaClient();
const WH_ACTIONS_URL = 'https://www.whitehouse.gov/briefing-room/presidential-actions/';

const SELECTORS = {
  ARTICLE: [
    '.news-item',
    'article',
    '.briefing-room__content article',
    '[data-component="briefing-room"] article'
  ].join(','),
  TITLE: 'h2,h3,.title',
  DATE: 'time,date,.date,.published-date',
  LINK: 'a[href*="/briefing-room/"]',
  CONTENT: 'article,.article-content,.content'
};

async function scrapeExecutiveOrders(): Promise<void> {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    logger.info('Starting White House actions scrape');
    
    await retry(async () => {
      await page.goto(WH_ACTIONS_URL, { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      
      const element = await page.waitForSelector(SELECTORS.ARTICLE, {
        timeout: 60000,
        state: 'visible'
      });
      
      if (!element) throw new Error('No articles found');
      
      const parentClass = await element.evaluate(el => el.parentElement?.className);
      logger.info(`Found articles container: ${parentClass}`);
    });

    // Debug logging
    const pageTitle = await page.title();
    logger.info(`Page title: ${pageTitle}`);
    
    const actions = await retry(async () => {
      return page.$$eval(SELECTORS.ARTICLE, (items, selectors) => {
        return items.map(item => ({
          title: item.querySelector(selectors.TITLE)?.textContent?.trim() || '',
          date: item.querySelector(selectors.DATE)?.getAttribute('datetime') || 
                item.querySelector(selectors.DATE)?.textContent?.trim() || '',
          url: item.querySelector(selectors.LINK)?.href || '',
          type: item.querySelector(selectors.TITLE)?.textContent?.toLowerCase().includes('executive order') 
            ? 'Executive Order' 
            : 'Memorandum'
        }));
      }, SELECTORS);
    });

    logger.info(`Found ${actions.length} presidential actions`);

    for (const action of actions) {
      if (!action.url) {
        logger.warn('Skipping action with no URL:', action);
        continue;
      }

      try {
        await retry(async () => {
          await page.goto(action.url, { 
            waitUntil: 'networkidle',
            timeout: 60000 
          });
          
          await page.waitForSelector(SELECTORS.CONTENT, {
            timeout: 60000,
            state: 'visible'
          });
        });

        const content = await page.$eval(SELECTORS.CONTENT, el => el.textContent || '');
        
        if (!content) {
          logger.warn('No content found for action:', action.url);
          continue;
        }

        const orderNumber = action.type === 'Executive Order' 
          ? action.title.match(/Executive Order (\d+)/)?.[1]
          : undefined;

        const scrapedOrder: ScrapedOrder = {
          type: action.type,
          orderNumber,
          title: action.title,
          date: new Date(action.date),
          url: action.url,
          summary: content.split('\n')[0]?.trim() || '',
          agencies: determineAgencies(content),
          categories: determineCategories(content)
        };

        await saveOrder(scrapedOrder);
        logger.info(`Processed: ${action.title}`);
        
        // Respect rate limits
        await page.waitForTimeout(3000);
      } catch (error) {
        logger.error('Error processing action:', { 
          error: error instanceof Error ? error.message : String(error),
          action 
        });
      }
    }
  } catch (error) {
    logger.error('Fatal scraping error:', error);
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
    logger.error('Error saving order:', { 
      error: error instanceof Error ? error.message : String(error),
      orderTitle: order.title,
      orderNumber: order.orderNumber,
      url: order.url 
    });
    throw error;
  }
}

if (import.meta.url === new URL(import.meta.resolve('.')).href) {
  scrapeExecutiveOrders()
    .catch(error => {
      logger.error('Scraping failed:', error);
      process.exit(1);
    });
}

export { scrapeExecutiveOrders };