// src/lib/scheduler/index.ts
import { PrismaClient, DocumentType } from '@prisma/client';
import { api } from '../api';
import { logger } from '@/utils/logger';
import type { Order } from '../api/types';

const prisma = new PrismaClient();

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds
const MIN_DATE = new Date('2025-01-01T00:00:00Z');
let consecutiveFailures = 0;

export class DocumentScheduler {
  private intervalMs: number;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private lastCheckTime?: Date;

  constructor(intervalMinutes: number = 30) {
    this.intervalMs = intervalMinutes * 60 * 1000;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    try {
      await this.initializeHistoricalData();
      this.isRunning = true;
      await this.checkNewDocuments();
      this.intervalId = setInterval(() => this.checkNewDocuments(), this.intervalMs);
      logger.info(`Scheduler started with ${this.intervalMs / 60000} minute interval`);
    } catch (error) {
      logger.error('Failed to start scheduler:', error);
      this.stop();
      throw error;
    }
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      this.lastCheckTime = undefined;
      logger.info('Scheduler stopped');
    }
  }

  private async retryWithDelay<T>(fn: () => Promise<T>, retries: number = MAX_RETRIES): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        logger.warn(`Retrying operation in ${RETRY_DELAY}ms. Retries left: ${retries - 1}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.retryWithDelay(fn, retries - 1);
      }
      throw error;
    }
  }

  public async initializeHistoricalData(): Promise<void> {
    try {
      logger.info('Starting historical data initialization');
      
      const existingCount = await prisma.order.count({
        where: {
          datePublished: {
            gte: MIN_DATE
          }
        }
      });
      
      if (existingCount > 0) {
        logger.info(`Database already contains ${existingCount} documents since ${MIN_DATE.toISOString()}. Skipping initialization.`);
        return;
      }

      const response = await this.retryWithDelay(() => api.orders.fetch());
      const orders = response.orders;
      
      // Filter for documents since 2025
      const relevantDocuments = orders.filter(doc => 
        new Date(doc.date) >= MIN_DATE
      );
      
      if (relevantDocuments.length === 0) {
        logger.info('No relevant historical documents found');
        return;
      }

      // Use transaction for atomic updates
      const created = await prisma.$transaction(async (tx) => {
        let createdCount = 0;
        
        for (const doc of relevantDocuments) {
          const existing = await tx.order.findFirst({
            where: {
              OR: [
                { link: doc.link },
                { number: doc.number }
              ]
            }
          });

          if (!existing) {
            await tx.order.create({
              data: {
                type: doc.type as DocumentType,
                number: doc.number || 'UNKNOWN',
                title: doc.title,
                summary: doc.summary,
                datePublished: new Date(doc.date),
                category: doc.category || 'Uncategorized',
                agency: doc.agency,
                link: doc.link || '',
                statusId: doc.statusId,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            createdCount++;
          }
        }
        
        return createdCount;
      });

      logger.info(`Added ${created} historical documents`);
    } catch (error) {
      logger.error('Error initializing historical data:', error);
      throw error;
    }
  }

  private async checkNewDocuments(): Promise<void> {
    try {
      logger.info('Starting document check', { lastCheck: this.lastCheckTime });
      consecutiveFailures = 0;
      
      const response = await this.retryWithDelay(() => api.orders.fetch());
      const latestDocuments = response.orders;
      
      // Filter for recent documents
      const relevantDocuments = latestDocuments.filter(doc => 
        new Date(doc.date) >= MIN_DATE
      );
      
      const existingDocuments = await prisma.order.findMany({
        where: {
          datePublished: {
            gte: MIN_DATE
          }
        },
        select: { 
          link: true, 
          number: true 
        }
      });
      
      const existingLinks = new Set(existingDocuments.map(doc => doc.link));
      const existingNumbers = new Set(existingDocuments.map(doc => doc.number));
      
      const newDocuments = relevantDocuments.filter(doc => {
        return !existingLinks.has(doc.link || '') && 
               !existingNumbers.has(doc.number || '');
      });
      
      if (newDocuments.length === 0) {
        logger.info('No new documents found');
        this.lastCheckTime = new Date();
        return;
      }
      
      const created = await prisma.$transaction(async (tx) => {
        let createdCount = 0;
        
        for (const doc of newDocuments) {
          // Double-check existence within transaction to prevent race conditions
          const exists = await tx.order.findFirst({
            where: {
              OR: [
                { link: doc.link },
                { number: doc.number }
              ]
            }
          });
          
          if (!exists) {
            await tx.order.create({
              data: {
                type: doc.type as DocumentType,
                number: doc.number || 'UNKNOWN',
                title: doc.title,
                summary: doc.summary,
                datePublished: new Date(doc.date),
                category: doc.category || 'Uncategorized',
                agency: doc.agency,
                link: doc.link || '',
                statusId: doc.statusId,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            createdCount++;
          }
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
        throw error;
      }
    }
  }

  private async notifyNewDocuments(documents: Order[]): Promise<void> {
    try {
      const documentsList = documents.map(d => ({
        type: d.type,
        title: d.title,
        number: d.number || 'N/A',
        date: d.date
      }));
      
      logger.info('New documents found:', { documents: documentsList });
      
    } catch (error) {
      logger.error('Error sending notifications:', error);
    }
  }

  public async manualCheck(): Promise<void> {
    await this.checkNewDocuments();
  }

  public getStatus(): { 
    isRunning: boolean;
    lastCheckTime?: Date;
    consecutiveFailures: number;
  } {
    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      consecutiveFailures
    };
  }
}

// Export singleton instance
export const documentScheduler = new DocumentScheduler(
  parseInt(process.env.SCHEDULER_INTERVAL_MINUTES || '30', 10)
);