// src/scheduler/documentScheduler.ts

import { PrismaClient, DocumentType } from '@prisma/client';
import { logger } from '@/utils/logger';

/** A minimal interface for incoming documents if you fetch them from somewhere. */
interface ExternalOrder {
  type?: string;
  number?: string;
  title?: string;
  summary?: string;
  datePublished?: string | Date;
  link?: string;
  category?: string; // single category name
  agency?: string;   // single agency name
}

// A placeholder for some function that fetches new documents from an API.
async function fetchOrders(): Promise<{ orders: ExternalOrder[] }> {
  // Real code would fetch from an external service. We'll mock an empty result.
  return { orders: [] };
}

const prisma = new PrismaClient();

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds
const MIN_DATE = new Date('2025-01-01T00:00:00Z');

/**
 * DocumentScheduler class. Periodically checks for new documents and inserts them in DB.
 */
export class DocumentScheduler {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private lastCheckTime?: Date;
  private consecutiveFailures = 0;
  private intervalMs: number;

  constructor(intervalMinutes = 30) {
    // Convert from minutes to milliseconds
    this.intervalMs = intervalMinutes * 60 * 1000;
  }

  /**
   * Start the scheduler (setInterval).
   */
  public start(): void {
    if (this.isRunning) {
      logger.info('Scheduler is already running.');
      return;
    }
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      this.checkNewDocuments().catch((err) => {
        logger.error('Error in scheduled check:', err);
      });
    }, this.intervalMs);

    logger.info(`Scheduler started. Will run every ${this.intervalMs / 1000} seconds.`);
  }

  /**
   * Stop the scheduler if it's running.
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
    logger.info('Scheduler stopped.');
  }

  /**
   * Return current status info for your route (isRunning, lastCheckTime, etc.).
   */
  public getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  /**
   * Manually trigger one check for new documents (e.g. from a button or cron route).
   */
  public async manualCheck(): Promise<void> {
    return this.checkNewDocuments();
  }

  /**
   * Main logic to fetch new documents, filter out duplicates, and insert them into DB.
   */
  private async checkNewDocuments() {
    try {
      logger.info(
        `Starting document check. Last check: ${this.lastCheckTime || 'N/A'}`
      );
      this.consecutiveFailures = 0;

      // 1) fetch from external or internal service
      const response = await this.retryWithDelay(() => fetchOrders());
      const latestDocs = response.orders;

      // 2) Filter out docs older than MIN_DATE
      const relevantDocs = latestDocs.filter((doc) => {
        const docDate = new Date(doc.datePublished || 0);
        return docDate >= MIN_DATE;
      });

      // 3) Find existing docs in the DB
      const existingDocs = await prisma.order.findMany({
        where: { datePublished: { gte: MIN_DATE } },
        select: { link: true, number: true },
      });
      const existingLinks = new Set(existingDocs.map((d) => d.link || ''));
      const existingNumbers = new Set(existingDocs.map((d) => d.number || ''));

      // 4) newDocs are those that are truly new
      const newDocs = relevantDocs.filter((doc) => {
        return (
          !existingLinks.has(doc.link || '') &&
          !existingNumbers.has(doc.number || '')
        );
      });

      if (newDocs.length === 0) {
        logger.info('No new documents found.');
        this.lastCheckTime = new Date();
        return;
      }

      // 5) Insert the new documents
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
              link: doc.link || null,

              // categories M:N
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

              // agencies M:N
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

      logger.info(`Added ${createdCount} new documents.`);
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

  /**
   * Helper function to retry an async function with a delay between attempts.
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
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        return this.retryWithDelay(fn, retries - 1);
      }
      throw error;
    }
  }
}

/** Export a singleton instance */
export const documentScheduler = new DocumentScheduler(
  parseInt(process.env.SCHEDULER_INTERVAL_MINUTES || '30', 10)
);
