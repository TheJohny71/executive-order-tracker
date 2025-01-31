import { chromium, type Page } from 'playwright';
import { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import pino from 'pino';
import pretty from 'pino-pretty';

// Initialize logger
const logger = pino(
  pretty({
    colorize: true
  })
);

const prisma = new PrismaClient();

interface ExecutiveOrderData {
  title: string | undefined;
  signedDate: Date;
  url: string | undefined;
  orderNumber: string | undefined;
}

export async function scrapeExecutiveOrders() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    logger.info('Starting executive order scrape');
    await page.goto('https://www.whitehouse.gov/briefing-room/presidential-actions/executive-orders/');
    
    const orders = await page.evaluate(() => {
      const orderElements = document.querySelectorAll('.post-feed article');
      return Array.from(orderElements).map(element => {
        const title = element.querySelector('h2')?.textContent?.trim();
        const dateStr = element.querySelector('.meta-date')?.textContent?.trim();
        const link = element.querySelector('a')?.href;
        const orderNumber = title?.match(/Executive Order \d+/)?.[0].split(' ').pop();
        
        return {
          title,
          signedDate: dateStr ? new Date(dateStr) : new Date(),
          url: link,
          orderNumber
        };
      });
    });

    logger.info({ orderCount: orders.length }, 'Found executive orders');

    for (const order of orders) {
      if (!order.orderNumber) {
        logger.warn({ order }, 'Skipping order without number');
        continue;
      }
      
      await prisma.executiveOrder.upsert({
        where: { orderNumber: order.orderNumber },
        update: {
          title: order.title,
          signedDate: order.signedDate,
          url: order.url,
        },
        create: {
          orderNumber: order.orderNumber,
          title: order.title || '',
          signedDate: order.signedDate,
          url: order.url || '',
        },
      });
      
      logger.info({ orderNumber: order.orderNumber }, 'Processed order');
    }

    logger.info('Completed executive order scrape');
  } catch (error) {
    logger.error('Error scraping executive orders:', error);
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}