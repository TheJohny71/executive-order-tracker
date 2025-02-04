// src/lib/scraper/index.ts
import { prisma } from '@/lib/prisma';
import { fetchExecutiveOrders } from '@/lib/api/whitehouse';
import type { ScrapedOrder } from './types';
import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(pretty({ colorize: true }));

export async function scrapeExecutiveOrders() {
  try {
    const orders = await fetchExecutiveOrders();
    
    for (const order of orders) {
      // First, create or update categories
      const categoryPromises = order.categories.map(async (category) => {
        const upsertedCategory = await prisma.category.upsert({
          where: { name: category.name },
          create: { name: category.name },
          update: {}
        });
        return { id: upsertedCategory.id };
      });

      // Then, create or update agencies
      const agencyPromises = order.agencies.map(async (agency) => {
        const upsertedAgency = await prisma.agency.upsert({
          where: { name: agency.name },
          create: { name: agency.name },
          update: {}
        });
        return { id: upsertedAgency.id };
      });

      const [categories, agencies] = await Promise.all([
        Promise.all(categoryPromises),
        Promise.all(agencyPromises)
      ]);

      // Create or update the executive order
      await prisma.executiveOrder.upsert({
        where: { 
          // Since orderNumber is optional, use URL as fallback unique identifier
          url: order.url 
        },
        create: {
          orderNumber: order.orderNumber,
          type: order.type,
          title: order.title,
          date: order.date,
          url: order.url,
          summary: order.summary,
          notes: order.notes,
          isNew: true,
          categories: {
            connect: categories
          },
          agencies: {
            connect: agencies
          }
        },
        update: {
          orderNumber: order.orderNumber,
          type: order.type,
          title: order.title,
          date: order.date,
          summary: order.summary,
          notes: order.notes,
          isNew: false,
          categories: {
            set: categories
          },
          agencies: {
            set: agencies
          }
        }
      });
    }

    logger.info('Successfully scraped and updated executive orders');
  } catch (error) {
    logger.error({ error }, 'Error in scrapeExecutiveOrders');
    throw error;
  }
}