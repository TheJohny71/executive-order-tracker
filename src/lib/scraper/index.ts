// src/lib/scraper/index.ts
import { PrismaClient, DocumentType } from '@prisma/client';
import { logger } from '@/utils/logger';
import { fetchExecutiveOrders } from '../api/whitehouse';
import type { ScrapedOrder } from '@/types';

export class DocumentScraper {
  private startDate: Date;
  private prisma: PrismaClient;

  constructor(startDate: Date = new Date('2025-01-01')) {
    this.startDate = startDate;
    this.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }

  public async scrapeHistoricalData(): Promise<{
    success: boolean;
    ordersScraped: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let ordersScraped = 0;

    try {
      logger.info(`Starting historical data scrape from ${this.startDate.toISOString()}`);
      
      const orders = await fetchExecutiveOrders();
      
      const relevantOrders = orders.filter(order => 
        new Date(order.date) >= this.startDate
      );

      logger.info(`Found ${relevantOrders.length} orders since ${this.startDate.toISOString()}`);

      for (const order of relevantOrders) {
        try {
          await this.processOrder(order);
          ordersScraped++;
          logger.info(`Processed order: ${order.identifier}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to process order ${order.identifier}: ${errorMessage}`);
          logger.error(`Error processing order ${order.identifier}:`, error);
        }
      }

      return {
        success: true,
        ordersScraped,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Historical scrape failed:', error);
      return {
        success: false,
        ordersScraped,
        errors: [...errors, `Scrape failed: ${errorMessage}`]
      };
    } finally {
      await this.prisma.$disconnect();
    }
  }

  private async processOrder(order: ScrapedOrder): Promise<void> {
    // Check if order already exists
    const existingOrder = await this.prisma.order.findFirst({
      where: { 
        OR: [
          { identifier: order.identifier },
          { 
            AND: [
              { title: order.title },
              { date: order.date }
            ]
          }
        ]
      }
    });

    if (!existingOrder) {
      // Create new order with all related data
      await this.prisma.order.create({
        data: {
          identifier: order.identifier,
          type: order.type,
          title: order.title,
          date: order.date,
          url: order.url,
          summary: order.summary,
          content: order.content,
          statusId: order.statusId || 'active',
          categories: {
            connectOrCreate: order.categories.map(cat => ({
              where: { name: cat.name },
              create: { name: cat.name }
            }))
          },
          agencies: {
            connectOrCreate: order.agencies.map(agency => ({
              where: { name: agency.name },
              create: { name: agency.name }
            }))
          }
        }
      });
      
      logger.info(`Created new order: ${order.identifier}`);
    } else {
      logger.info(`Order ${order.identifier} already exists, skipping`);
    }
  }

  public async checkForUpdates(): Promise<void> {
    try {
      logger.info('Starting update check');
      const latestOrders = await fetchExecutiveOrders();
      
      for (const order of latestOrders) {
        await this.processOrder(order);
      }
      
      logger.info('Update check completed successfully');
    } catch (error) {
      logger.error('Error checking for updates:', error);
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export an instance for direct use
export const documentScraper = new DocumentScraper();