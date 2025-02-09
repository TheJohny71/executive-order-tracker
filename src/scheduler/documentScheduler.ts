// src/scheduler/documentScheduler.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';
import { fetchExecutiveOrders } from '@/lib/api/whitehouse';
import type { ScrapedOrder } from '@/types';

interface SchedulerStatus {
  isRunning: boolean;
  lastRunTime?: Date;
  errorCount: number;
  interval: number;
  lastError?: Error;
}

export class DocumentScheduler {
  private readonly intervalMs: number;
  private isRunning: boolean;
  private intervalId?: NodeJS.Timeout;
  private lastRunTime?: Date;
  private errorCount: number;
  private lastError?: Error;
  private readonly MAX_ERRORS: number;
  private readonly ERROR_RESET_TIME: number;
  private readonly prisma: PrismaClient;
  private readonly startDate: Date;

  constructor(intervalMinutes: number = 15) {
    this.intervalMs = intervalMinutes * 60 * 1000;
    this.isRunning = false;
    this.errorCount = 0;
    this.MAX_ERRORS = 3;
    this.ERROR_RESET_TIME = 1000 * 60 * 60; // 1 hour
    this.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
    this.startDate = new Date('2025-01-01');
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    try {
      await this.initializeHistoricalData();
      
      this.isRunning = true;
      await this.manualCheck();
      this.intervalId = setInterval(() => {
        void this.manualCheck();
      }, this.intervalMs);
      
      logger.info(`Scheduler started with ${this.intervalMs / 60000} minute interval`);
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to start scheduler:', this.lastError);
      throw this.lastError;
    }
  }

  public async initializeHistoricalData(): Promise<void> {
    try {
      logger.info('Initializing historical data...');
      
      const latestOrders = await fetchExecutiveOrders();
      const relevantOrders = latestOrders.filter(order => 
        new Date(order.date) >= this.startDate
      );

      let processedCount = 0;
      for (const order of relevantOrders) {
        await this.processOrder(order);
        processedCount++;
      }
      
      logger.info(`Historical data initialized with ${processedCount} orders`);
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to initialize historical data:', this.lastError);
      throw this.lastError;
    }
  }

  private async processOrder(order: ScrapedOrder): Promise<void> {
    try {
      const whereClause: Prisma.OrderWhereInput = {
        OR: [
          { orderNumber: order.identifier },
          { 
            AND: [
              { title: order.title },
              { publishedAt: order.date }
            ]
          }
        ]
      };

      const existingOrder = await this.prisma.order.findFirst({
        where: whereClause
      });

      if (!existingOrder) {
        const createData: Prisma.OrderCreateInput = {
          orderNumber: order.identifier,
          type: order.type,
          title: order.title,
          publishedAt: order.date,
          url: order.url,
          summary: order.summary,
          content: order.content,
          notes: order.notes,
          statusId: 1, // Convert string to number
          isNew: true,
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
        };

        await this.prisma.order.create({
          data: createData
        });
        
        logger.info(`Created new order: ${order.identifier}`);
      } else {
        logger.debug(`Order ${order.identifier} already exists, skipping`);
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error processing order ${order.identifier}:`, this.lastError);
      throw this.lastError;
    }
  }

  public async manualCheck(): Promise<void> {
    if (this.errorCount >= this.MAX_ERRORS) {
      const timeSinceLastError = this.lastRunTime ? Date.now() - this.lastRunTime.getTime() : 0;
      if (timeSinceLastError < this.ERROR_RESET_TIME) {
        logger.warn('Too many recent errors, skipping update check');
        return;
      }
      this.errorCount = 0;
    }

    try {
      const startTime = Date.now();
      const latestOrders = await fetchExecutiveOrders();
      
      for (const order of latestOrders) {
        await this.processOrder(order);
      }
      
      const duration = Date.now() - startTime;
      this.lastRunTime = new Date();
      this.errorCount = 0;
      
      logger.info(`Update check completed successfully in ${duration}ms`);
    } catch (error) {
      this.errorCount++;
      this.lastRunTime = new Date();
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error('Error checking for updates:', this.lastError);
      
      if (this.errorCount >= this.MAX_ERRORS) {
        logger.error(`Maximum error count (${this.MAX_ERRORS}) reached, will pause checks for 1 hour`);
      }
    }
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      logger.info('Scheduler stopped');
    }
  }

  public getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      errorCount: this.errorCount,
      interval: this.intervalMs,
      lastError: this.lastError
    };
  }

  public async cleanup(): Promise<void> {
    this.stop();
    await this.prisma.$disconnect();
  }
}

// Export a singleton instance
export const documentScheduler = new DocumentScheduler();