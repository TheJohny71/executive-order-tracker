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

    // Initialize historical data before starting regular checks
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
      
      // Check if we already have documents
      const existingCount = await prisma.order.count();
      
      if (existingCount > 0) {
        log.info(`Database already contains ${existingCount} documents. Skipping initialization.`);
        return;
      }

      // Fetch historical documents
      const documents = await this.retryWithDelay(() => fetchExecutiveOrders());
      
      if (documents.length === 0) {
        log.info('No historical documents found');
        return;
      }

      // Add historical documents to database
      await prisma.$transaction(async (tx) => {
        for (const doc of documents) {
          await tx.order.create({
            data: {
              type: doc.type,
              number: doc.metadata.orderNumber || 'UNKNOWN',
              title: doc.title || 'Untitled Document',
              summary: doc.summary || '',
              datePublished: doc.date,
              category: doc.metadata.categories[0]?.name || 'Uncategorized',
              agency: doc.metadata.agencies[0]?.name || null,
              link: doc.url || '',
              statusId: 1, // Default status
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
      
      // Fetch latest documents with retry logic
      const latestDocuments = await this.retryWithDelay(() => fetchExecutiveOrders());
      
      // Get existing document links
      const existingDocuments = await prisma.order.findMany({
        select: { link: true, number: true }
      });
      
      const existingLinks = new Set(existingDocuments.map(doc => doc.link ?? ''));
      const existingNumbers = new Set(existingDocuments.map(doc => doc.number ?? ''));
      
      // Filter new documents
      const newDocuments = latestDocuments.filter(doc => 
        !existingLinks.has(doc.url) && 
        !existingNumbers.has(doc.metadata.orderNumber ?? '')
      );
      
      if (newDocuments.length === 0) {
        log.info('No new documents found');
        this.lastCheckTime = new Date();
        return;
      }
      
      // Add new documents to database
      await prisma.$transaction(async (tx) => {
        for (const newDoc of newDocuments) {
          await tx.order.create({
            data: {
              type: newDoc.type,
              number: newDoc.metadata.orderNumber || 'UNKNOWN',
              title: newDoc.title || 'Untitled Document',
              summary: newDoc.summary || '',
              datePublished: newDoc.date,
              category: newDoc.metadata.categories[0]?.name || 'Uncategorized',
              agency: newDoc.metadata.agencies[0]?.name || null,
              link: newDoc.url || '',
              statusId: 1, // Default status
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
        number: d.metadata.orderNumber || 'N/A',
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