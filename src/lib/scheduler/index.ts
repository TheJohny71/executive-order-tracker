// src/lib/scheduler/index.ts
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';
import { fetchExecutiveOrders } from '../api/whitehouse';
import type { ScrapedOrder } from '@/types';

const prisma = new PrismaClient();
const log = pino(pretty({ colorize: true }));

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds
let consecutiveFailures = 0;

export class DocumentScheduler {
  private intervalMs: number;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private lastCheckTime?: Date;

  constructor(intervalMinutes: number = 15) {
    this.intervalMs = intervalMinutes * 60 * 1000;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      log.warn('Scheduler is already running');
      return;
    }

    await this.initializeHistoricalData();
    this.isRunning = true;
    await this.checkNewDocuments();
    this.intervalId = setInterval(() => this.checkNewDocuments(), this.intervalMs);
    log.info(`Scheduler started with ${this.intervalMs / 60000} minute interval`);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      this.lastCheckTime = undefined;
      log.info('Scheduler stopped');
    }
  }

  private async retryWithDelay<T>(fn: () => Promise<T>, retries: number = MAX_RETRIES): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        log.warn(`Retrying operation in ${RETRY_DELAY}ms. Retries left: ${retries - 1}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.retryWithDelay(fn, retries - 1);
      }
      throw error;
    }
  }

  public async initializeHistoricalData(): Promise<void> {
    try {
      log.info('Starting historical data initialization');
      
      const existingCount = await prisma.order.count();
      
      if (existingCount > 0) {
        log.info(`Database already contains ${existingCount} documents. Skipping initialization.`);
        return;
      }

      const documents = await this.retryWithDelay(() => fetchExecutiveOrders());
      
      if (documents.length === 0) {
        log.info('No historical documents found');
        return;
      }

      await prisma.$transaction(async (tx) => {
        for (const doc of documents) {
          await tx.order.create({
            data: {
              type: doc.type,
              identifier: doc.metadata?.orderNumber || 'UNKNOWN',
              title: doc.title || 'Untitled Document',
              summary: doc.summary || '',
              publishedAt: doc.date,
              categoryName: doc.metadata?.categories?.[0]?.name || 'Uncategorized',
              agencyName: doc.metadata?.agencies?.[0]?.name || null,
              url: doc.url || '',
              statusId: 1,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      });

      log.info(`Added ${documents.length} historical documents`);
    } catch (error) {
      log.error('Error initializing historical data:', error);
      throw error;
    }
  }

  private async checkNewDocuments(): Promise<void> {
    try {
      log.info('Starting document check', { lastCheck: this.lastCheckTime });
      consecutiveFailures = 0;
      
      const latestDocuments = await this.retryWithDelay(() => fetchExecutiveOrders());
      
      const existingDocuments = await prisma.order.findMany({
        select: { url: true, identifier: true }
      });
      
      const existingUrls = new Set(existingDocuments.map(doc => doc.url));
      const existingIdentifiers = new Set(existingDocuments.map(doc => doc.identifier));
      
      const newDocuments = latestDocuments.filter(doc => {
        return !existingUrls.has(doc.url) && 
               !existingIdentifiers.has(doc.metadata?.orderNumber || '');
      });
      
      if (newDocuments.length === 0) {
        log.info('No new documents found');
        this.lastCheckTime = new Date();
        return;
      }
      
      await prisma.$transaction(async (tx) => {
        for (const doc of newDocuments) {
          await tx.order.create({
            data: {
              type: doc.type,
              identifier: doc.metadata?.orderNumber || 'UNKNOWN',
              title: doc.title || 'Untitled Document',
              summary: doc.summary || '',
              publishedAt: doc.date,
              categoryName: doc.metadata?.categories?.[0]?.name || 'Uncategorized',
              agencyName: doc.metadata?.agencies?.[0]?.name || null,
              url: doc.url || '',
              statusId: 1,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      });
      
      log.info(`Added ${newDocuments.length} new documents`);
      await this.notifyNewDocuments(newDocuments);
      this.lastCheckTime = new Date();
      
    } catch (error) {
      consecutiveFailures++;
      log.error('Error checking for new documents:', error);
      
      if (consecutiveFailures >= MAX_RETRIES) {
        log.error('Too many consecutive failures. Stopping scheduler.');
        this.stop();
        throw error;
      }
    }
  }

  private async notifyNewDocuments(documents: ScrapedOrder[]): Promise<void> {
    try {
      const documentsList = documents.map(d => ({
        type: d.type,
        title: d.title || 'Untitled',
        identifier: d.metadata?.orderNumber || 'N/A',
        date: d.date
      }));
      
      log.info('New documents found:', { documents: documentsList });
      
    } catch (error) {
      log.error('Error sending notifications:', error);
    }
  }

  public async manualCheck(): Promise<void> {
    await this.checkNewDocuments();
  }
}