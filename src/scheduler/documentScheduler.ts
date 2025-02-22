import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import type { ScrapedOrder } from '@/types';
import axios from 'axios';

const prisma = new PrismaClient();

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const MIN_DATE = new Date('2025-01-01T00:00:00Z');

interface AWSScrapeResponse {
  success: boolean;
  orders: ScrapedOrder[];
  error?: string;
}

export class DocumentScheduler {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private lastCheckTime?: Date;
  private consecutiveFailures = 0;
  private intervalMs: number;

  constructor(intervalMinutes = 30) {
    this.intervalMs = intervalMinutes * 60 * 1000;
  }

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

  public stop(): void {
    if (!this.isRunning) return;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    logger.info('Scheduler stopped.');
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  public async manualCheck(): Promise<void> {
    return this.checkNewDocuments();
  }

  private async fetchFromAWS(): Promise<AWSScrapeResponse> {
    if (!process.env.AWS_API_ENDPOINT) {
      throw new Error('AWS_API_ENDPOINT not configured');
    }
    
    const response = await axios.get<AWSScrapeResponse>(process.env.AWS_API_ENDPOINT);
    return response.data;
  }

  private async checkNewDocuments() {
    try {
      logger.info(`Starting document check. Last check: ${this.lastCheckTime || 'N/A'}`);
      
      const result = await this.retryWithDelay(() => this.fetchFromAWS());
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error in AWS response');
      }

      const newDocs = result.orders.filter(doc => {
        const docDate = new Date(doc.date);
        return docDate >= MIN_DATE;
      });

      if (newDocs.length === 0) {
        logger.info('No new documents found.');
        this.lastCheckTime = new Date();
        return;
      }

      const createdCount = await prisma.$transaction(async (tx) => {
        let count = 0;
        for (const doc of newDocs) {
          await tx.order.create({
            data: {
              type: doc.type,
              number: doc.identifier,
              title: doc.title,
              summary: doc.summary || '',
              datePublished: doc.date,
              link: doc.url,
              statusId: parseInt(doc.statusId, 10),
              categories: {
                connectOrCreate: doc.categories.map(cat => ({
                  where: { name: cat.name },
                  create: { name: cat.name }
                }))
              },
              agencies: {
                connectOrCreate: doc.agencies.map(agency => ({
                  where: { name: agency.name },
                  create: { name: agency.name }
                }))
              }
            }
          });
          count++;
        }
        return count;
      });

      logger.info(`Added ${createdCount} new documents.`);
      this.consecutiveFailures = 0;
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

  private async retryWithDelay<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 1) {
        logger.warn(`Retrying operation in ${RETRY_DELAY_MS}ms. Retries left: ${retries - 1}`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        return this.retryWithDelay(fn, retries - 1);
      }
      throw error;
    }
  }
}

export const documentScheduler = new DocumentScheduler(
  parseInt(process.env.SCHEDULER_INTERVAL_MINUTES || '30', 10)
);