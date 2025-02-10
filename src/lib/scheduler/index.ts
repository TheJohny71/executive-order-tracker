// src/lib/scheduler/index.ts

import { PrismaClient, DocumentType } from '@prisma/client';
import { fetchOrders } from '@/api';       // example – adjust if your actual import differs
import { logger } from '@/utils/logger';
import type { Order, OrdersResponse } from '@/api/types'; // example – adjust path
// import type { ??? } from 'zod'; // if needed

const prisma = new PrismaClient();

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;       // 5 seconds
const MIN_DATE = new Date('2025-01-01T00:00:00Z');

let consecutiveFailures = 0;

export class DocumentScheduler {
  private isRunning: boolean = false;
  private lastCheckTime?: Date;
  private intervalMinutes: number;

  constructor(intervalMinutes = 30) {
    // Default to 30 minutes if not specified
    this.intervalMinutes = intervalMinutes * 60 * 1000; 
  }

  public stop(): void {
    if (this.isRunning) {
      clearInterval(this.intervalId!);
      this.isRunning = false;
      logger.info('Scheduler stopped');
    }
  }

  private intervalId?: NodeJS.Timeout;

  private async retryWithDelay<T>(
    fn: () => Promise<T>,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 1) {
        logger.warn(`Retrying operation in ${RETRY_DELAY_MS}ms. Retries left: ${retries - 1}`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return this.retryWithDelay(fn, retries - 1);
      }
      throw error;
    }
  }

  // Called once, to ensure we have baseline data in the DB
  public async initializeHistoricalData(): Promise<void> {
    try {
      logger.info('Starting Historical data initialization');

      const existingCount = await prisma.order.count({
        where: { datePublished: { gte: MIN_DATE } },
      });

      if (existingCount > 0) {
        logger.info('Already have historical data. Skipping init...');
        return;
      }

      // Suppose we fetch or define "relevantDocuments" from somewhere
      // For illustration, let's just define an example array:
      const relevantDocuments: Array<Partial<Order>> = [
        {
          type: 'EXECUTIVE_ORDER',
          number: 'EO-2025-HIST-001',
          title: 'Historical EO #1',
          summary: 'An older Executive Order from the past',
          datePublished: '2025-01-10T00:00:00Z',
          // old => category: 'General', agency: 'Some Agency'
          category: 'Historical Category',
          agency: 'Some Old Agency',
        },
        // ... more docs ...
      ];

      // Use a transaction for atomic updates
      const created = await prisma.$transaction(async (tx) => {
        let createdCount = 0;

        for (const doc of relevantDocuments) {
          // Check if we have an existing order with the same link or number
          const existing = await tx.order.findFirst({
            where: {
              OR: [
                { link: doc.link || '' },
                { number: doc.number || '' },
              ],
            },
          });
          if (!existing) {
            await tx.order.create({
              data: {
                type: (doc.type as DocumentType) || DocumentType.EXECUTIVE_ORDER,
                number: doc.number || 'UNKNOWN',
                title: doc.title || 'Untitled',
                summary: doc.summary || null,
                datePublished: doc.datePublished
                  ? new Date(doc.datePublished)
                  : new Date(),
                link: doc.link ?? null,

                // NEW: attach categories / agencies
                categories: doc.category
                  ? {
                      connectOrCreate: [
                        {
                          where: { name: doc.category },
                          create: { name: doc.category },
                        },
                      ],
                    }
                  : undefined,
                agencies: doc.agency
                  ? {
                      connectOrCreate: [
                        {
                          where: { name: doc.agency },
                          create: { name: doc.agency },
                        },
                      ],
                    }
                  : undefined,
              },
            });
            createdCount++;
          }
        }

        return createdCount;
      });

      logger.info(`Initialized historical data. Created: ${created} new Orders.`);
    } catch (error) {
      logger.error('Error initializing historical data:', error);
      throw error;
    }
  }

  private async checkNewDocuments(): Promise<void> {
    try {
      logger.info('Starting document check; lastCheck: ' + (this.lastCheckTime ?? 'N/A'));
      consecutiveFailures = 0;

      // Example fetch from your existing API:
      const response = await this.retryWithDelay(() => fetchOrders());
      const latestDocuments = response.orders;

      // Filter for new docs that are after MIN_DATE
      const relevantDocuments = latestDocuments.filter(
        (doc: Order) => new Date(doc.datePublished) >= MIN_DATE
      );

      // Check existing docs in DB
      const existingDocuments = await prisma.order.findMany({
        where: { datePublished: { gte: MIN_DATE } },
        select: { link: true, number: true },
      });

      const existingLinks = new Set(existingDocuments.map((d) => d.link || ''));
      const existingNumbers = new Set(existingDocuments.map((d) => d.number || ''));

      // newDocuments are those that aren't in DB yet
      const newDocuments = relevantDocuments.filter((doc: Order) => {
        return !existingLinks.has(doc.link || '') && !existingNumbers.has(doc.number || '');
      });

      if (newDocuments.length === 0) {
        logger.info('No new documents found');
        this.lastCheckTime = new Date();
        return;
      }

      // Insert new documents in a transaction
      const created = await prisma.$transaction(async (tx) => {
        let createdCount = 0;
        for (const doc of newDocuments) {
          await tx.order.create({
            data: {
              type: (doc.type as DocumentType) || DocumentType.EXECUTIVE_ORDER,
              number: doc.number || 'UNKNOWN',
              title: doc.title || 'Untitled',
              summary: doc.summary || null,
              datePublished: doc.datePublished
                ? new Date(doc.datePublished)
                : new Date(),
              link: doc.link || null,

              // NEW: attach category/agency if present
              categories: doc.category
                ? {
                    connectOrCreate: [
                      {
                        where: { name: doc.category },
                        create: { name: doc.category },
                      },
                    ],
                  }
                : undefined,
              agencies: doc.agency
                ? {
                    connectOrCreate: [
                      {
                        where: { name: doc.agency },
                        create: { name: doc.agency },
                      },
                    ],
                  }
                : undefined,
            },
          });
          createdCount++;
        }
        return createdCount;
      });

      logger.info(`Added ${created} new documents`);
      if (created > 0) {
        await this.notifyNewDocuments(newDocuments);
      }

      this.lastCheckTime = new Date();
    } catch (error) {
      consecutiveFailures++;
      logger.error('Error checking for new documents:', error);

      if (consecutiveFailures >= MAX_RETRIES) {
        logger.error('Too many consecutive failures. Stopping scheduler.');
        this.stop();
      }
    }
  }

  private async notifyNewDocuments(documents: Order[]): Promise<void> {
    try {
      const documentsList = documents.map((d) => ({
        type: d.type,
        title: d.title,
        number: d.number || 'N/A',
        date: d.datePublished,
      }));
      logger.info('New documents found:', documentsList);
      // e.g. send email or Slack notifications about the new docs
    } catch (error) {
      logger.error('Error sending notifications:', error);
    }
  }

  public async manualCheck(): Promise<void> {
    await this.checkNewDocuments();
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      consecutiveFailures,
    };
  }
}

// Export a singleton instance (optional usage)
export const documentScheduler = new DocumentScheduler(
  parseInt(process.env.SCHEDULER_INTERVAL_MINUTES || '30', 10)
);
