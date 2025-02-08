import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { fetchExecutiveOrders } from '@/lib/api/whitehouse';
import type { ScrapedOrder } from '@/types';

const prisma = new PrismaClient();

export class DocumentScheduler {
  private intervalMs: number;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(intervalMinutes: number = 60) {
    this.intervalMs = intervalMinutes * 60 * 1000;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    await this.checkNewDocuments();
    this.intervalId = setInterval(() => this.checkNewDocuments(), this.intervalMs);
    logger.info(`Scheduler started with ${this.intervalMs / 60000} minute interval`);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      logger.info('Scheduler stopped');
    }
  }

  private async checkNewDocuments(): Promise<void> {
    try {
      logger.info('Starting document check');
      
      const latestDocuments = await fetchExecutiveOrders();
      
      const existingDocuments = await prisma.order.findMany({
        select: { link: true }
      });
      
      const existingUrls = new Set(existingDocuments.map(doc => doc.link));
      const newDocuments = latestDocuments.filter(doc => !existingUrls.has(doc.url));
      
      if (newDocuments.length === 0) {
        logger.info('No new documents found');
        return;
      }
      
      for (const newDoc of newDocuments) {
        const orderData: Prisma.OrderCreateInput = {
          type: newDoc.type,
          number: newDoc.metadata.orderNumber || '',
          title: newDoc.title,
          summary: newDoc.summary || '',
          datePublished: newDoc.date,
          category: newDoc.categories[0]?.name || '',
          agency: newDoc.agencies[0]?.name || null,
          link: newDoc.url,
          status: {
            connect: {
              id: 1 // Default status ID
            }
          }
        };

        await prisma.order.create({
          data: orderData
        });
      }
      
      logger.info(`Added ${newDocuments.length} new documents`);
      await this.notifyNewDocuments(newDocuments);
      
    } catch (error) {
      logger.error('Error checking for new documents:', error);
      throw error;
    }
  }

  private async notifyNewDocuments(documents: ScrapedOrder[]): Promise<void> {
    try {
      const documentsList = documents.map(d => `${d.type}: ${d.title}`).join('\n');
      logger.info('New documents found:\n' + documentsList);
      
    } catch (error) {
      logger.error('Error sending notifications:', error);
      throw error;
    }
  }

  public async manualCheck(): Promise<void> {
    await this.checkNewDocuments();
  }
}