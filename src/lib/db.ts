import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const CONNECTION_TIMEOUT = 5000; // 5 seconds

// Define event interfaces based on Prisma's structure
interface ExtendedPrismaClient extends PrismaClient {
  $on(event: 'query', callback: (event: PrismaQueryEvent) => void): void;
  $on(event: 'warn', callback: (event: PrismaLogEvent) => void): void;
  $on(event: 'error', callback: (event: PrismaLogEvent) => void): void;
}

interface PrismaQueryEvent {
  timestamp: Date;
  query: string;
  params: string;
  duration: number;
  target: string;
}

interface PrismaLogEvent {
  timestamp: Date;
  message: string;
  target?: string;
}

export class DatabaseClient {
  private static instance: ExtendedPrismaClient | null = null;
  private static retryCount = 0;
  private static isConnecting = false;
  private static connectionPromise: Promise<void> | null = null;

  static async getInstance(): Promise<ExtendedPrismaClient> {
    if (!this.instance) {
      await this.initialize();
    }
    return this.instance!;
  }

  private static async initialize(): Promise<void> {
    if (this.isConnecting) {
      if (this.connectionPromise) {
        await this.connectionPromise;
        return;
      }
    }

    this.isConnecting = true;
    this.connectionPromise = this.initializeClient();

    try {
      await Promise.race([
        this.connectionPromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT)
        )
      ]);
    } catch (error) {
      this.isConnecting = false;
      this.connectionPromise = null;
      throw error;
    }

    this.isConnecting = false;
    this.connectionPromise = null;
  }

  private static async initializeClient(): Promise<void> {
    const prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
      errorFormat: 'minimal',
    });

    this.instance = prisma as ExtendedPrismaClient;

    // Type-safe event handlers
    this.instance.$on('query', (event: PrismaQueryEvent) => {
      logger.debug('Query:', {
        query: event.query,
        params: event.params,
        duration: event.duration,
        timestamp: event.timestamp
      });
    });

    this.instance.$on('error', (event: PrismaLogEvent) => {
      logger.error('Prisma Error:', {
        message: event.message,
        target: event.target
      });
    });

    this.instance.$on('warn', (event: PrismaLogEvent) => {
      logger.warn('Prisma Warning:', {
        message: event.message,
        target: event.target
      });
    });

    // Add error handling middleware
    this.instance.$use(async (params, next) => {
      const startTime = Date.now();
      try {
        const result = await next(params);
        const duration = Date.now() - startTime;
        
        if (duration > 1000) { // Log slow queries (>1s)
          logger.warn('Slow query detected:', {
            model: params.model,
            action: params.action,
            duration,
          });
        }
        
        return result;
      } catch (error) {
        if (this.isConnectionError(error)) {
          logger.warn('Database connection error, attempting to reconnect...');
          await this.reconnect();
          return next(params);
        }
        throw error;
      }
    });

    try {
      await this.instance.$connect();
      logger.info('Successfully connected to database');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  private static isConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('closed') ||
      errorMessage.includes('ended') ||
      errorMessage.includes('terminated')
    );
  }

  static async reconnect(): Promise<void> {
    if (this.retryCount >= MAX_RETRIES) {
      this.retryCount = 0;
      throw new Error('Max reconnection attempts reached');
    }

    try {
      if (this.instance) {
        await this.instance.$disconnect();
        this.instance = null;
      }
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, this.retryCount)));
      
      await this.initialize();
      
      this.retryCount = 0;
      logger.info('Successfully reconnected to database');
    } catch (error) {
      this.retryCount++;
      logger.error(`Reconnection attempt ${this.retryCount} failed:`, error);
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const instance = await this.getInstance();
      await instance.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}