// lib/db.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class DatabaseClient {
  private static instance: PrismaClient;
  private static retryCount = 0;

  static async getInstance(): Promise<PrismaClient> {
    if (!this.instance) {
      this.instance = new PrismaClient({
        log: ['error', 'warn'],
        errorFormat: 'minimal',
      });

      // Add middleware for connection error handling
      this.instance.$use(async (params, next) => {
        try {
          return await next(params);
        } catch (error) {
          if (error?.message?.includes('Connection closed')) {
            logger.warn('Database connection closed, attempting to reconnect...');
            await this.reconnect();
            // Retry the operation
            return await next(params);
          }
          throw error;
        }
      });
    }
    return this.instance;
  }

  static async reconnect(): Promise<void> {
    if (this.retryCount >= MAX_RETRIES) {
      this.retryCount = 0;
      throw new Error('Max reconnection attempts reached');
    }

    try {
      if (this.instance) {
        await this.instance.$disconnect();
      }
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      this.instance = new PrismaClient();
      await this.instance.$connect();
      
      this.retryCount = 0;
      logger.info('Successfully reconnected to database');
    } catch (error) {
      this.retryCount++;
      logger.error(`Reconnection attempt ${this.retryCount} failed:`, error);
      await this.reconnect();
    }
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
    }
  }
}