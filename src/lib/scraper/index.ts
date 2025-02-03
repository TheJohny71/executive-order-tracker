// src/lib/scraper/index.ts
import { chromium, type Page } from 'playwright';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(pretty({ colorize: true }));
const prisma = new PrismaClient();

// Add a check for the database connection
async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

interface ScrapedOrder {
  type: string;
  orderNumber: string | undefined;
  title: string;
  date: Date;
  url: string;
  summary?: string;
  agencies: string[];
  categories: string[];
}

interface RawOrder {
  type: string;
  orderNumber: string | undefined;
  title: string;
  date: string;
  url: string;
}

export async function scrapeExecutiveOrders() {
  // Check database connection first
  await checkDatabaseConnection();
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    logger.info('Starting presidential actions scrape');
    // Start with executive orders
    await scrapeOrdersFromPage(page, 'https://www.whitehouse.gov/briefing-room/presidential-actions/executive-orders/');
    // Then scrape presidential memoranda
    await scrapeOrdersFromPage(page, 'https://www.whitehouse.gov/briefing-room/presidential-actions/presidential-memoranda/');
    
    logger.info('Completed presidential actions scrape');
  } catch (error) {
    logger.error('Error scraping presidential actions:', error);
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

async function scrapeOrdersFromPage(page: Page, url: string) {
  logger.info(`Scraping orders from ${url}`);
  await page.goto(url);
  await page.waitForSelector('article');

  const orders = await page.evaluate(() => {
    const orderElements = document.querySelectorAll('article');
    const orders = Array.from(orderElements).map(element => {
      const titleEl = element.querySelector('h2');
      const dateEl = element.querySelector('time, .meta-date');
      const linkEl = element.querySelector('a');
      const title = titleEl?.textContent?.trim() || '';
      
      const isEO = title.toLowerCase().includes('executive order');
      const type = isEO ? 'Executive Order' : 'Memorandum';
      const orderNumber = isEO ? title.match(/Executive Order (\d+)/)?.[1] : undefined;
      
      const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
      const date = new Date(dateStr);
      
      // Only include items from 2025 onwards
      if (date.getFullYear() >= 2025 && linkEl?.href) {
        const order: RawOrder = {
          type,
          orderNumber,
          title,
          date: dateStr,
          url: linkEl.href
        };
        return order;
      }
      return undefined;
    });
    
    // Filter out undefined values and sort by date (newest first)
    return orders
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

      const categories = determineCategories(content);
      const agencies = determineAgencies(content);

      const scrapedOrder: ScrapedOrder = {
        type: order.type,
        orderNumber: order.orderNumber,
        title: order.title,
        date: new Date(order.date),
        url: order.url,
        summary,
        agencies,
        categories
      };

      await saveOrder(scrapedOrder);
      logger.info({ title: order.title }, 'Processed order');
    } catch (error) {
      logger.error({ error, order }, 'Error processing individual order');
    }
  }
}

function determineCategories(content: string): string[] {
  const categories = new Set<string>();
  
  const categoryKeywords = {
    'Education': ['education', 'school', 'student', 'learning'],
    'Military': ['military', 'defense', 'veteran', 'armed forces'],
    'Economy': ['economy', 'economic', 'financial', 'treasury'],
    'Healthcare': ['health', 'medical', 'healthcare', 'hospital'],
    'Environment': ['environment', 'climate', 'energy', 'pollution'],
    'Immigration': ['immigration', 'border', 'visa', 'asylum'],
    'Technology': ['technology', 'cyber', 'digital', 'internet'],
    'Foreign Policy': ['foreign', 'international', 'diplomatic', 'embassy']
  };

  const contentLower = content.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => contentLower.includes(keyword))) {
      categories.add(category);
    }
  }

  return Array.from(categories);
}

function determineAgencies(content: string): string[] {
  const agencies = new Set<string>();
  
  const agencyKeywords = {
    'Department of Education': ['department of education', 'education department'],
    'Department of Defense': ['department of defense', 'defense department', 'pentagon'],
    'Department of State': ['department of state', 'state department'],
    'Department of Treasury': ['department of treasury', 'treasury department'],
    'Department of Homeland Security': ['department of homeland security', 'dhs'],
    'Department of Justice': ['department of justice', 'justice department', 'doj']
  };

  const contentLower = content.toLowerCase();
  for (const [agency, keywords] of Object.entries(agencyKeywords)) {
    if (keywords.some(keyword => contentLower.includes(keyword))) {
      agencies.add(agency);
    }
  }

  return Array.from(agencies);
}

async function saveOrder(order: ScrapedOrder) {
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
        : { id: '' }; // This will trigger a create operation

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
        categories: { 
          set: [], 
          connect: categoryConnects 
        },
        agencies: { 
          set: [], 
          connect: agencyConnects 
        }
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

// Run the scraper if this file is executed directly
if (require.main === module) {
  scrapeExecutiveOrders()
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}