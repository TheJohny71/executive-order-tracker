import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';
import type { ScrapedOrder } from './types';
import { retry } from './utils';
import { fetchExecutiveOrders } from '../api/whitehouse';

const logger = pino(pretty({ colorize: true }));
const prisma = new PrismaClient();

async function scrapeExecutiveOrders(): Promise<void> {
 try {
   logger.info('Starting executive order fetch');
   
   const orders = await retry(async () => {
     return await fetchExecutiveOrders();
   });

   logger.info(`Found ${orders.length} executive orders`);

   for (const order of orders) {
     try {
       await saveOrder(order);
       logger.info(`Processed: ${order.title}`);
       
       // Basic rate limiting
       await new Promise(resolve => setTimeout(resolve, 1000));
       
     } catch (error) {
       logger.error('Error processing order:', { 
         error: error instanceof Error ? error.message : String(error),
         order: {
           title: order.title,
           number: order.orderNumber,
           url: order.url
         }
       });
     }
   }
 } catch (error) {
   logger.error('Fatal error:', error);
   throw error;
 } finally {
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

export { scrapeExecutiveOrders };