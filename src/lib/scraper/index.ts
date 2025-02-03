import { chromium, type Page } from 'playwright';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';
import { fileURLToPath } from 'url';
import path from 'path';
import type { ScrapedOrder, RawOrder } from './types';
import { determineCategories, determineAgencies } from './utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    logger.info('Starting presidential actions scrape');
    await scrapeOrdersFromPage(page, 'https://www.whitehouse.gov/briefing-room/presidential-actions/');
    logger.info('Completed presidential actions scrape');
  } catch (error) {
    logger.error('Error scraping presidential actions:', error);
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

async function scrapeOrdersFromPage(page: Page, url: string): Promise<void> {
  logger.info(`Scraping orders from ${url}`);
  await page.goto(url);
  await page.waitForSelector('article');

  const orders = await page.evaluate(() => {
    const orderElements = document.querySelectorAll('article');
    return Array.from(orderElements)
      .map(element => {
        const titleEl = element.querySelector('h2');
        const dateEl = element.querySelector('time, .meta-date');
        const linkEl = element.querySelector('a');
        const title = titleEl?.textContent?.trim() || '';
        
        const isEO = title.toLowerCase().includes('executive order');
        const type = isEO ? 'Executive Order' : 'Memorandum';
        const orderNumber = isEO ? title.match(/Executive Order (\d+)/)?.[1] : undefined;
        
        const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
        const date = new Date(dateStr);
        
        if (date.getFullYear() >= 2025 && linkEl?.href) {
          return {
            type,
            orderNumber,
            title,
            date: dateStr,
            url: linkEl.href
          };
        }
        return undefined;
      })
      .filter((order): order is RawOrder => order !== undefined)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  logger.info(`Found ${orders.length} orders from 2025 onwards`);

  for (const order of orders) {
    try {
      await page.goto(order.url);
      
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