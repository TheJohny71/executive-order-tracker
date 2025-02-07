import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';
import { fetchExecutiveOrders } from '../api/whitehouse';
import type { ScrapedOrder } from '../types';

const prisma = new PrismaClient();
const log = pino(pretty({ colorize: true }));

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const MAX_RETRIES = 3;
let consecutiveFailures = 0;

export class DocumentScheduler {
  private intervalMs: number;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(intervalMinutes: number = 15) {
    this.intervalMs = intervalMinutes * 60 * 1000;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      log.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    await this.checkNewDocuments();
    this.intervalId = setInterval(() => this.checkNewDocuments(), this.intervalMs);
    log.info(`Scheduler started with ${this.intervalMs / 60000} minute interval`);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      log.info('Scheduler stopped');
    }
  }

  private async checkNewDocuments(): Promise<void> {
    try {
      log.info('Starting document check');
      consecutiveFailures = 0;
      
      // Fetch latest documents
      const latestDocuments = await fetchExecutiveOrders();
      
      // Get existing document links
      const existingDocuments = await prisma.order.findMany({
        select: { link: true }
      });
      
      const existingLinks = new Set(existingDocuments.map(doc => doc.link));
      
      // Filter new documents
      const newDocuments = latestDocuments.filter(doc => !existingLinks.has(doc.link));
      
      if (newDocuments.length === 0) {
        log.info('No new documents found');
        return;
      }
      
      // Add new documents to database
      for (const newDoc of newDocuments) {
        await prisma.order.create({
          data: {
            number: newDoc.number,
            type: newDoc.type,
            title: newDoc.title,
            summary: newDoc.summary,
            datePublished: newDoc.datePublished,
            category: newDoc.category,
            agency: newDoc.agency,
            link: newDoc.link,
            statusId: newDoc.statusId
          }
        });
      }
      
      log.info(`Added ${newDocuments.length} new documents`);
      await this.notifyNewDocuments(newDocuments);
      
    } catch (error) {
      consecutiveFailures++;
      log.error('Error checking for new documents:', error);
      
      if (consecutiveFailures >= MAX_RETRIES) {
        log.error('Too many consecutive failures. Stopping scheduler.');
        this.stop();
        process.exit(1);
      }
    }
  }

  private async notifyNewDocuments(documents: ScrapedOrder[]): Promise<void> {
    try {
      const documentsList = documents.map(d => `${d.type}: ${d.title}`).join('\n');
      log.info('New documents found:\n' + documentsList);
      
      // TODO: Implement notification system (email, webhook, etc.)
      
    } catch (error) {
      log.error('Error sending notifications:', error);
      throw error;
    }
  }

  // Method to manually trigger a check
  public async manualCheck(): Promise<void> {
    await this.checkNewDocuments();
  }
}

// Start the scheduler if this file is run directly
if (require.main === module) {
  const scheduler = new DocumentScheduler();
  scheduler.start().catch((error) => {
    log.error('Failed to start scheduler:', error);
    process.exit(1);
  });
}