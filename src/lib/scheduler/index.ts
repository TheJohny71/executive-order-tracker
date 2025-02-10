// src/lib/scheduler/index.ts

import { PrismaClient, DocumentType } from '@prisma/client';
import { logger } from '@/utils/logger';

// If you don't have a real function to fetch your orders, define a placeholder:
async function fetchOrders(): Promise<{ orders: MyOrder[] }> {
  // For demonstration, returning an empty list
  return { orders: [] };
}

// Define a minimal interface for your "Order" from external sources
interface MyOrder {
  type?: string;
  number?: string;
  link?: string;
  summary?: string;
  datePublished?: string | Date;
  category?: string;   // single category name
  agency?: string;     // single agency name
  title?: string;
}

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds
const MIN_DATE = new Date('2025-01-01T00:00:00Z');

// Create one PrismaClient instance
const prisma = new PrismaClient();

/**
 * A scheduler class that periodically checks for new “Orders” and saves them to the DB.
 */
export class DocumentScheduler {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private lastCheckTime?: Date;
  private consecutiveFailures = 0;

  // We store how often to run (in ms)
  private intervalMinutes: number;

  constructor(intervalMinutes = 30) {
    // Convert minutes to milliseconds
    this.intervalMinutes = intervalMinutes * 60 * 1000;
  }

  /**
   * Called to start the scheduler with setInterval.
   */
  public start(): void {
    if (this.isRunning) {
      logger.info('Scheduler is already running');
      return;
    }
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkNewDocuments().catch((err) => {
        logger.error('Error in scheduled check:', err);
      });
    }, this.intervalMinutes);

    logger.info(`Scheduler started. Will run every ${this.intervalMinutes / 1000} seconds.`);
  }

  /**
   * Stop the scheduler if running.
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  /**
   * Manually trigger one check (e.g. from a CRON route or a button).
   */
  public async manualCheck(): Promise<void> {
    return this.checkNewDocuments();
  }

  /**
   * A private helper to run a function with retries.
   */
  private async retryWithDelay<T>(
    fn: () => Promise<T>,
    retries = MAX_RETRIES
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 1) {
        logger.warn(
          `Retrying operation in ${RETRY_DELAY_MS}ms. Retries left: ${retries - 1}`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return this.retryWithDelay(fn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Periodically checks for new documents, inserts them in DB if they don't exist yet.
   */
  private async checkNewDocuments(): Promise<void> {
    try {
      logger.info(`Starting document check. Last check: ${this.lastCheckTime || 'N/A'}`);
      this.consecutiveFailures = 0;

      // 1) fetch from an external API (or internal logic)
      const response = await this.retryWithDelay(() => fetchOrders());
      const latestDocuments = response.orders;

      // 2) Filter docs that are from 2025 onwards
      const relevantDocs = latestDocuments.filter((doc) => {
        const docDate = new Date(doc.datePublished ?? 0);
        return docDate >= MIN_DATE;
      });

      // 3) Find existing docs in DB
      const existingDocs = await prisma.order.findMany({
        where: { datePublished: { gte: MIN_DATE } },
        select: { link: true, number: true },
      });
      const existingLinks = new Set(existingDocs.map((d) => d.link ?? ''));
      const existingNumbers = new Set(existingDocs.map((d) => d.number ?? ''));

      // 4) newDocs are the ones that aren't in DB yet
      const newDocs = relevantDocs.filter((doc) => {
        return (
          !existingLinks.has(doc.link ?? '') &&
          !existingNumbers.has(doc.number ?? '')
        );
      });

      if (newDocs.length === 0) {
        logger.info('No new documents found');
        this.lastCheckTime = new Date();
        return;
      }

      // 5) Insert them in a Prisma transaction
      const createdCount = await prisma.$transaction(async (tx) => {
        let count = 0;
        for (const doc of newDocs) {
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

              // If doc.category is a single string, attach it
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

              // If doc.agency is a single string, attach it
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
          count++;
        }
        return count;
      });

      logger.info(`Added ${createdCount} new documents`);
      this.lastCheckTime = new Date();
    } catch (error) {
      this.consecutiveFailures++;
      logger.error('Error checking for new documents:', error);

      if (this.consecutiveFailures >= MAX_RETRIES) {
        logger.error('Too many consecutive failures. Stopping scheduler.');
        this.stop();
      }
    }
  }
}

/**
 * Export a singleton instance so you can import { documentScheduler }
 * anywhere, e.g. call documentScheduler.start() in cron, or manualCheck().
 */
export const documentScheduler = new DocumentScheduler(
  parseInt(process.env.SCHEDULER_INTERVAL_MINUTES || '30', 10)
);
