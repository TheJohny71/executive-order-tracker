import { chromium, type Page } from 'playwright';
import { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(pretty({ colorize: true }));
const prisma = new PrismaClient();

interface ScrapedOrder {
  type: string;
  orderNumber?: string;
  title: string;
  date: Date;
  url: string;
  summary?: string;
  agencies: string[];
  categories: string[];
}

export async function scrapeExecutiveOrders() {
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
  await page.goto(url);
  await page.waitForSelector('article');

  const orders = await page.evaluate(() => {
    const orderElements = document.querySelectorAll('article');
    return Array.from(orderElements).map(element => {
      const titleEl = element.querySelector('h2');
      const dateEl = element.querySelector('time, .meta-date');
      const linkEl = element.querySelector('a');
      const title = titleEl?.textContent?.trim() || '';
      
      // Determine type and extract order number if present
      const isEO = title.toLowerCase().includes('executive order');
      const type = isEO ? 'Executive Order' : 'Memorandum';
      const orderNumber = isEO ? title.match(/Executive Order (\d+)/)?.[1] : undefined;

      return {
        type,
        orderNumber,
        title,
        date: dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim(),
        url: linkEl?.href,
        summary: '', // Will be populated when visiting individual pages
        agencies: [], // Will be populated when visiting individual pages
        categories: [] // Will be determined based on content analysis
      };
    });
  });

  // Visit each order's page to get additional details
  for (const order of orders) {
    if (!order.url) continue;
    
    await page.goto(order.url);
    
    // Extract summary from the first paragraph
    const summary = await page.$eval('article p', 
      (el) => el?.textContent?.trim() || ''
    ).catch(() => '');

    // Extract agencies mentioned in the content
    const content = await page.$eval('article', 
      (el) => el?.textContent?.trim() || ''
    ).catch(() => '');

    // Determine categories and agencies based on content analysis
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
    // Create or connect categories
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

    // Create or connect agencies
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

    // Check if order exists
    const whereClause = order.orderNumber 
      ? { orderNumber: order.orderNumber }
      : { url: order.url };

    await prisma.executiveOrder.upsert({
      where: whereClause,
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

    logger.info({ title: order.title }, 'Saved order');
  } catch (error) {
    logger.error({ error, order }, 'Error saving order');
    throw error;
  }
}