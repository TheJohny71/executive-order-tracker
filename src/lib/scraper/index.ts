import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';
import type { ScrapedOrder } from './types';
import { determineCategories, determineAgencies } from './utils';

const logger = pino(pretty({ colorize: true }));
const prisma = new PrismaClient();
const WH_ACTIONS_URL = 'https://www.whitehouse.gov/briefing-room/presidential-actions/';

async function scrapeExecutiveOrders(): Promise<void> {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0'
  });
  
  const page = await context.newPage();
  
  try {
    logger.info('Starting White House actions scrape');
    await page.goto(WH_ACTIONS_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('.news-item');

    const actions = await page.$$eval('.news-item', items => {
      return items.map(item => ({
        title: item.querySelector('h2')?.textContent?.trim() || '',
        date: item.querySelector('time')?.getAttribute('datetime') || '',
        url: item.querySelector('a')?.href || '',
        type: item.querySelector('h2')?.textContent?.toLowerCase().includes('executive order') 
          ? 'Executive Order' 
          : 'Memorandum'
      }));
    });

    logger.info(`Found ${actions.length} presidential actions`);

    for (const action of actions) {
      try {
        await page.goto(action.url, { waitUntil: 'networkidle' });
        const content = await page.$eval('article', el => el.textContent || '');
        
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
        await page.waitForTimeout(2000);
      } catch (error) {
        logger.error('Error processing action:', { 
          error: error instanceof Error ? error.message : String(error),
          action 
        });
      }
    }
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

async function saveOrder(order: ScrapedOrder): Promise<void> {
  // ... keep existing saveOrder function ...
}

export { scrapeExecutiveOrders };