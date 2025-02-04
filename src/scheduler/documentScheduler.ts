// src/scheduler/documentScheduler.ts
import { PrismaClient } from '@prisma/client';
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
      
      // Fetch latest documents
      const latestDocuments = await fetchExecutiveOrders();
      
      // Get existing document URLs
      const existingDocuments = await prisma.executiveOrder.findMany({
        select: { url: true }
      });
      
      const existingUrls = new Set(existingDocuments.map(doc => doc.url));
      
      // Filter new documents
      const newDocuments = latestDocuments.filter(doc => !existingUrls.has(doc.url));
      
      if (newDocuments.length === 0) {
        logger.info('No new documents found');
        return;
      }
      
      // Add new documents to database
      for (const doc of newDocuments) {
        await prisma.executiveOrder.create({
          data: {
            orderNumber: doc.orderNumber,
            type: doc.type,
            title: doc.title,
            date: doc.date,
            url: doc.url,
            summary: doc.summary,
            isNew: true,
            status: 'Active',
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
      }
      
      logger.info(`Added ${newDocuments.length} new documents`);
      await this.notifyNewDocuments(newDocuments);
      
    } catch (error) {
      logger.error('Error checking for new documents:', error);
    }
  }

  private async notifyNewDocuments(documents: ScrapedOrder[]): Promise<void> {
    try {
      const documentsList = documents.map(d => `${d.type}: ${d.title}`).join('\n');
      logger.info('New documents found:\n' + documentsList);
      
      // TODO: Implement notification system (email, webhook, etc.)
      
    } catch (error) {
      logger.error('Error sending notifications:', error);
    }
  }

  // Method to manually trigger a check
  public async manualCheck(): Promise<void> {
    await this.checkNewDocuments();
  }
}